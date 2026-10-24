/* ============================================================
   CampusFix – Employee Dashboard JS
   employee.js — loads on employee_dashboard.html
   ============================================================ */

// ── Guard: only employees can access this page ──────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!currentUser || currentUser.role !== 'employee') {
    window.location.href = 'login.html';
    return;
  }

  // Populate user info in sidebar / welcome banner
  document.getElementById('sidebarEmpName').textContent  = currentUser.name || '—';
  document.getElementById('welcomeName').textContent     = currentUser.name || '—';
  document.getElementById('userDesigDisplay').textContent = currentUser.designation || 'Staff';
  document.getElementById('welcomeDesig').textContent    =
    `${currentUser.designation || 'Staff'} · ${currentUser.department_name || 'Loading department...'}`;

  // Fetch dept name to fill subtitle
  if (currentUser.department_id) {
    apiFetch(`/departments/${currentUser.department_id}`)
      .then(dept => {
        if (dept) {
          document.getElementById('welcomeDesig').textContent =
            `${currentUser.designation || 'Staff'} · ${dept.name}`;
          currentUser._deptName    = dept.name;
          currentUser._categoryTag = dept.category_tag;
        }
        loadDashboard();
      })
      .catch(() => loadDashboard());
  } else {
    loadDashboard();
  }
});

// ── Load everything needed for the overview ──────────────────
async function loadDashboard() {
  await Promise.all([loadOverviewStats(), loadRecentTasks(), loadAttendance(), loadLeaves(), loadPayslips()]);
}

// ── OVERVIEW STATS ───────────────────────────────────────────
async function loadOverviewStats() {
  try {
    const [complaints, attRecords] = await Promise.all([
      apiFetch('/complaints'),
      apiFetch(`/attendance?employee_id=${currentUser.id}`),
    ]);

    const deptTag = currentUser._categoryTag || '';

    // Department total (excluding upvoted copies)
    const deptComplaints = complaints.filter(c =>
      c.source !== 'upvoted' &&
      c.category &&
      deptTag &&
      c.category.toLowerCase() === deptTag.toLowerCase()
    );

    // Assigned to me
    const myAssigned  = complaints.filter(c => String(c.assigned_to_id) === String(currentUser.id));
    const myCompleted = myAssigned.filter(c => c.status === 'Closed' || c.status === 'Waiting Confirmation');
    const myPending   = myAssigned.filter(c => c.status === 'In Progress' || c.status === 'Pending');

    // Late completed: deadline was in the past when closed
    const myLate = myCompleted.filter(c => {
      if (!c.deadline) return false;
      const closeDate = new Date(c.updatedAt || c.created_at);
      const dl = new Date(c.deadline + 'T23:59:59');
      return closeDate > dl;
    });

    const daysPresent = (attRecords || []).filter(a => a.status === 'Present' || a.status === 'Late').length;

    document.getElementById('dStatTotal').textContent    = deptComplaints.length;
    document.getElementById('dStatAssigned').textContent = myAssigned.length;
    document.getElementById('dStatCompleted').textContent = myCompleted.length;
    document.getElementById('dStatPending').textContent  = myPending.length;
    document.getElementById('dStatLate').textContent     = myLate.length;
    document.getElementById('dStatPresent').textContent  = daysPresent;
  } catch (err) { console.error('loadOverviewStats', err); }
}

// ── RECENT TASKS (overview table) ────────────────────────────
async function loadRecentTasks() {
  try {
    const complaints = await apiFetch('/complaints');
    const myTasks = complaints
      .filter(c => String(c.assigned_to_id) === String(currentUser.id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    renderTaskRows('recentTasksBody', myTasks, 5);
  } catch (err) { console.error('loadRecentTasks', err); }
}

// ── ALL TASKS ────────────────────────────────────────────────
async function loadMyTasks() {
  try {
    const complaints = await apiFetch('/complaints');
    const statusFilt = document.getElementById('taskFilterStatus').value;

    let myTasks = complaints
      .filter(c => String(c.assigned_to_id) === String(currentUser.id));

    if (statusFilt) myTasks = myTasks.filter(c => c.status === statusFilt);
    myTasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    renderTaskRows('allTasksBody', myTasks, Infinity);
  } catch (err) { console.error('loadMyTasks', err); }
}

function renderTaskRows(tbodyId, tasks, limit) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';

  const items = tasks.slice(0, limit);

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:28px;">No tasks found.</td></tr>`;
    return;
  }

  items.forEach(c => {
    const locText = c.location_desc || `Loc #${c.location_id}`;
    const dlBadge = getDeadlineBadge(c.deadline, c.status);
    tbody.innerHTML += `
      <tr>
        <td style="font-weight:600;color:var(--accent);">#CF-${c.id}</td>
        <td>
          <strong>${c.title}</strong>
          <small>${locText}</small>
        </td>
        <td><span class="urgency-${(c.urgency || '').toLowerCase()}">${c.urgency || 'Medium'}</span></td>
        <td>${getStatusBadge(c.status)}</td>
        <td>${formatDate(c.deadline) || '—'}${dlBadge}</td>
      </tr>`;
  });
}

// ── ATTENDANCE ───────────────────────────────────────────────
let todayAttRecord = null;

async function loadAttendance() {
  try {
    const records = await apiFetch(`/attendance?employee_id=${currentUser.id}`);
    const sorted  = (records || []).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Check if already clocked in today
    const today  = new Date().toISOString().split('T')[0];
    todayAttRecord = sorted.find(r => r.date === today) || null;
    updateClockBtn();

    // Stats
    const present  = sorted.filter(r => r.status === 'Present' || r.status === 'Late' || r.status === 'Late_1' || r.status === 'Late_2').length;
    const late     = sorted.filter(r => r.status === 'Late' || r.status === 'Late_1' || r.status === 'Late_2' || r.is_late).length;
    const withHrs  = sorted.filter(r => r.working_hours && r.working_hours > 0);
    const avgHrs   = withHrs.length ? (withHrs.reduce((s, r) => s + r.working_hours, 0) / withHrs.length).toFixed(1) : '0';

    document.getElementById('attPresent').textContent = present;
    document.getElementById('attLate').textContent    = late;
    document.getElementById('attAvgHrs').innerHTML    = `${avgHrs} <span style="font-size:1rem;font-weight:600;">Hrs</span>`;
    document.getElementById('dStatPresent').textContent = present;

    // Clock-in status banner
    const banner = document.getElementById('clockStatusBanner');
    if (todayAttRecord && todayAttRecord.clock_in) {
      banner.style.display = 'flex';
      if (todayAttRecord.clock_out) {
        banner.style.borderColor = 'var(--success)';
        banner.style.background  = 'var(--success-bg)';
        banner.style.color       = 'var(--success)';
        banner.innerHTML = `✓ Clocked in at ${todayAttRecord.clock_in} &nbsp;|&nbsp; Clocked out at ${todayAttRecord.clock_out} &nbsp;|&nbsp; ${todayAttRecord.working_hours ? todayAttRecord.working_hours.toFixed(1) + ' hrs worked' : ''}`;
      } else {
        const lateLabel = todayAttRecord.status === 'Late_1' ? ' (Slightly Late)' : todayAttRecord.status === 'Late_2' ? ' (Late)' : '';
        banner.style.borderColor = todayAttRecord.is_late ? 'var(--warning)' : 'var(--success)';
        banner.style.background  = todayAttRecord.is_late ? 'var(--warning-bg)' : 'var(--success-bg)';
        banner.style.color       = todayAttRecord.is_late ? 'var(--warning)' : 'var(--success)';
        banner.innerHTML = `🟢 Clocked in at ${todayAttRecord.clock_in}${lateLabel} &nbsp;—&nbsp; Work in progress. Click Clock Out when done.`;
      }
    } else {
      banner.style.display = 'none';
    }

    // Table
    const tbody = document.getElementById('attendanceBody');
    tbody.innerHTML = '';
    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No records found.</td></tr>`;
      return;
    }
    sorted.forEach(r => {
      const statusColor = r.status === 'Present'
        ? 'status-closed'
        : (r.status === 'Late_1' || r.status === 'Late')
          ? 'status-pending'
          : r.status === 'Late_2'
            ? 'status-reopened'
            : 'status-reopened';
      const displayStatus = r.status === 'Late_1' ? 'Slightly Late' : r.status === 'Late_2' ? 'Late' : (r.status || 'Present');
      tbody.innerHTML += `
        <tr>
          <td>${r.date}</td>
          <td>${r.clock_in || '—'}</td>
          <td>${r.clock_out || '—'}</td>
          <td>${r.working_hours ? r.working_hours.toFixed(1) + ' hrs' : '—'}</td>
          <td>${r.day_type || 'Regular'}</td>
          <td><span class="status-badge ${statusColor}">${displayStatus}</span></td>
        </tr>`;
    });
  } catch (err) { console.error('loadAttendance', err); }
}

/* ─── CLOCK BUTTON STATE ─────────────────────────────────────── */
function updateClockBtn() {
  const btn   = document.getElementById('clockBtn');
  const label = document.getElementById('clockBtnLabel');
  if (!btn) return;

  btn.disabled = false;
  btn.style.opacity = '1';
  btn.style.cursor  = 'pointer';

  if (!todayAttRecord) {
    label.textContent    = 'Clock In';
    btn.style.background = 'var(--accent)';
  } else if (!todayAttRecord.clock_out) {
    label.textContent    = 'Clock Out';
    btn.style.background = 'var(--danger)';
  } else {
    label.textContent    = 'Done for today ✓';
    btn.disabled         = true;
    btn.style.opacity    = '0.55';
    btn.style.cursor     = 'default';
    btn.style.background = 'var(--text-muted)';
  }
}

/* ─── CHITKARA UNIVERSITY GEOFENCE ──────────────────────────────
   Chitkara University Rajpura, Patiala
   Lat: 30.5094°N  Lng: 76.6566°E
   Radius: 500 metres (tight enough to block home, generous for campus)
──────────────────────────────────────────────────────────────── */
const CAMPUS_LAT    = 30.5094;
const CAMPUS_LNG    = 76.6566;
const CAMPUS_RADIUS = 500; // metres

// Haversine formula — returns distance in metres between two coords
function getDistanceMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius metres
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns a Promise resolving to { lat, lng } or rejects with a message
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject('Your browser does not support geolocation. Clock-in requires location access.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => {
        if (err.code === 1) reject('Location permission denied. Please allow location access and try again.');
        else if (err.code === 2) reject('Location unavailable. Make sure GPS/Wi-Fi is enabled.');
        else reject('Location request timed out. Try again.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

function isOnCampus(lat, lng) {
  const dist = getDistanceMetres(lat, lng, CAMPUS_LAT, CAMPUS_LNG);
  return { onCampus: dist <= CAMPUS_RADIUS, distance: Math.round(dist) };
}

/* ─── TIME CATEGORIES ────────────────────────────────────────
   Before 09:00  → On Time        (status: Present)
   09:00–09:30   → Slightly Late  (status: Late_1)   — minor deduction
   After 09:30   → Late           (status: Late_2)   — standard late mark
   (We still store is_late flag; status drives salary logic)
──────────────────────────────────────────────────────────────── */
function getTimeCategory(timeStr) {
  if (timeStr < '09:00') return { status: 'Present',    label: 'On Time',       isLate: false };
  if (timeStr <= '09:30') return { status: 'Late_1',    label: 'Slightly Late', isLate: true  };
  return                         { status: 'Late_2',    label: 'Late',          isLate: true  };
}

function showClockSpinner(show) {
  const btn = document.getElementById('clockBtn');
  if (!btn) return;
  btn.disabled = show;
  btn.style.opacity = show ? '0.7' : '1';
  document.getElementById('clockBtnLabel').textContent = show ? 'Getting location…' : (todayAttRecord ? 'Clock Out' : 'Clock In');
}

async function handleClockAction() {
  // If already done for today, do nothing
  if (todayAttRecord && todayAttRecord.clock_out) return;

  const now     = new Date();
  const today   = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5); // "HH:MM"

  // ── Step 1: Get location (required for both clock-in AND clock-out) ──
  showClockSpinner(true);
  let coords;
  try {
    coords = await getCurrentPosition();
  } catch (geoErr) {
    showClockSpinner(false);
    showCustomAlert('Location Required', `${geoErr}\n\nAttendance cannot be marked without verifying your campus location.`);
    return;
  }

  const { onCampus, distance } = isOnCampus(coords.lat, coords.lng);

  // ── CLOCK IN ──────────────────────────────────────────────
  if (!todayAttRecord) {
    if (!onCampus) {
      showClockSpinner(false);
      showCustomAlert(
        'Not on Campus',
        `You are ${distance}m away from Chitkara University campus.\n\nClock-in is only allowed when you are physically present on campus. Your location has been checked.`
      );
      return;
    }

    const { status, label, isLate } = getTimeCategory(timeStr);

    try {
      const record = await apiFetch('/attendance', {
        method: 'POST',
        body: JSON.stringify({
          employee_id:   currentUser.id,
          date:          today,
          clock_in:      timeStr,
          clock_in_lat:  coords.lat,
          clock_in_lng:  coords.lng,
          day_type:      'Regular',
          status,
          is_late:       isLate,
          department_id: String(currentUser.department_id || ''),
        }),
      });

      todayAttRecord = record;
      updateClockBtn();

      let msg = `You clocked in at ${timeStr}.`;
      if (status === 'Present')  msg += '\n✅ On time — full attendance marked.';
      if (status === 'Late_1')   msg += '\n🟡 Slightly late (9:00–9:30). Minor deduction may apply.';
      if (status === 'Late_2')   msg += '\n🔴 Late arrival (after 9:30). Marked as Late.';

      showCustomAlert(`Clocked In — ${label}`, msg);
      loadAttendance();
    } catch (err) {
      showClockSpinner(false);
      showCustomAlert('Error', err.message || 'Clock-in failed. You may have already clocked in today.');
    }

  // ── CLOCK OUT ─────────────────────────────────────────────
  } else if (!todayAttRecord.clock_out) {
    if (!onCampus) {
      showClockSpinner(false);
      showCustomAlert(
        'Not on Campus',
        `You are ${distance}m away from campus.\n\nClock-out requires you to be on campus. If you left early, please contact your department head.`
      );
      return;
    }

    const [inH, inM]  = todayAttRecord.clock_in.split(':').map(Number);
    const [outH, outM] = timeStr.split(':').map(Number);
    const workedHrs = Math.max(0, ((outH * 60 + outM) - (inH * 60 + inM)) / 60);

    try {
      const updated = await apiFetch(`/attendance/${todayAttRecord.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          clock_out:      timeStr,
          clock_out_lat:  coords.lat,
          clock_out_lng:  coords.lng,
          working_hours:  parseFloat(workedHrs.toFixed(2)),
        }),
      });

      todayAttRecord = { ...todayAttRecord, ...updated };
      updateClockBtn();
      showCustomAlert(
        'Clocked Out ✓',
        `Clocked out at ${timeStr}.\nTotal hours worked: ${workedHrs.toFixed(1)} hrs.\n\nSee you tomorrow!`
      );
      loadAttendance();
    } catch (err) {
      showClockSpinner(false);
      showCustomAlert('Error', err.message || 'Clock-out failed. Try again.');
    }
  }
}

// ── LEAVE ────────────────────────────────────────────────────
function openLeaveModal() {
  document.getElementById('leaveModal').classList.remove('hidden');
  // Set min date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('leaveFrom').min = today;
  document.getElementById('leaveTo').min   = today;
}
function closeLeaveModal() {
  document.getElementById('leaveModal').classList.add('hidden');
  document.getElementById('leaveForm').reset();
}

async function loadLeaves() {
  try {
    const leaves = await apiFetch(`/leaves?employee_id=${currentUser.id}`);
    const sorted = (leaves || []).sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));

    // Summary counts (approved leaves)
    const approved = sorted.filter(l => l.status === 'Approved');
    document.getElementById('leaveSick').innerHTML   = `${approved.filter(l => l.leave_type === 'Sick Leave').length} <span style="font-size:0.85rem;font-weight:500;color:var(--text-muted);">taken</span>`;
    document.getElementById('leaveCasual').innerHTML = `${approved.filter(l => l.leave_type === 'Casual Leave').length} <span style="font-size:0.85rem;font-weight:500;color:var(--text-muted);">taken</span>`;
    document.getElementById('leaveAnnual').innerHTML = `${approved.filter(l => l.leave_type === 'Annual Leave').length} <span style="font-size:0.85rem;font-weight:500;color:var(--text-muted);">taken</span>`;

    const tbody = document.getElementById('leaveBody');
    tbody.innerHTML = '';
    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:32px;">No leave applications found.</td></tr>`;
      return;
    }
    sorted.forEach(l => {
      const statusClass = l.status === 'Approved' ? 'status-closed' : l.status === 'Rejected' ? 'status-reopened' : 'status-pending';
      tbody.innerHTML += `
        <tr>
          <td style="font-weight:600;color:var(--text-primary);">${l.leave_type}</td>
          <td>${l.from_date} → ${l.to_date}</td>
          <td style="max-width:220px;color:var(--text-secondary);">${l.reason}</td>
          <td><span class="status-badge ${statusClass}">${l.status}</span></td>
        </tr>`;
    });
  } catch (err) { console.error('loadLeaves', err); }
}

async function submitLeave(e) {
  e.preventDefault();
  clearAllErrors(document.getElementById('leaveForm'));

  let ok = true;
  ok = validateSelect('leaveType', 'leave type') && ok;
  ok = validateRequired('leaveFrom', 'From date')  && ok;
  ok = validateRequired('leaveTo',   'To date')    && ok;
  ok = validateRequired('leaveReason', 'Reason')   && ok;
  if (!ok) return;

  const from = document.getElementById('leaveFrom').value;
  const to   = document.getElementById('leaveTo').value;
  if (to < from) {
    showFieldError('leaveTo', 'End date must be after start date.');
    return;
  }

  const payload = {
    employee_id:   currentUser.id,
    employee_name: currentUser.name,
    department_id: String(currentUser.department_id || ''),
    leave_type:    document.getElementById('leaveType').value,
    from_date:     from,
    to_date:       to,
    reason:        document.getElementById('leaveReason').value.trim(),
  };

  try {
    await apiFetch('/leaves', { method: 'POST', body: JSON.stringify(payload) });
    closeLeaveModal();
    loadLeaves();
    switchTab('leave');
    showCustomAlert('Leave Submitted', 'Your leave request has been sent to your department head for approval.');
  } catch (err) {
    showCustomAlert('Error', err.message || 'Failed to submit leave. Try again.');
  }
}

// ── PAYSLIPS ─────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

async function loadPayslips() {
  try {
    const slips = await apiFetch(`/payslips?employee_id=${currentUser.id}`);
    const sorted = (slips || []).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });

    const tbody = document.getElementById('payslipBody');
    tbody.innerHTML = '';
    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No payslips generated yet.</td></tr>`;
      return;
    }
    sorted.forEach(s => {
      const period   = `${MONTHS[s.month - 1]} ${s.year}`;
      const basic    = `₹${Number(s.basic_salary).toLocaleString()}`;
      const allow    = `₹${Number(s.allowances || 0).toLocaleString()}`;
      const deduct   = `₹${Number(s.deductions || 0).toLocaleString()}`;
      const net      = `₹${Number(s.net_salary).toLocaleString()}`;
      tbody.innerHTML += `
        <tr>
          <td style="font-weight:600;color:var(--text-primary);">${period}</td>
          <td>${basic}</td>
          <td style="color:var(--success);">+${allow}</td>
          <td style="color:var(--danger);">-${deduct}</td>
          <td style="font-weight:700;color:var(--accent);">${net}</td>
          <td>
            <button class="action-btn" onclick='showPayslipPreview(${JSON.stringify(s).replace(/'/g,"&apos;")})'>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
              Download
            </button>
          </td>
        </tr>`;
    });
  } catch (err) { console.error('loadPayslips', err); }
}

function showPayslipPreview(slip) {
  const period = `${MONTHS[slip.month - 1]} ${slip.year}`;
  const html = `
    <div style="border:1px solid var(--border);border-radius:var(--radius);padding:24px;font-size:0.86rem;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
        <div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--text-primary);">CampusFix</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Campus Infrastructure System</div>
        </div>
        <div style="text-align:right;font-size:0.8rem;color:var(--text-muted);">
          <div style="font-weight:700;color:var(--text-primary);">PAYSLIP</div>
          <div>${period}</div>
        </div>
      </div>
      <hr style="border-color:var(--border);margin-bottom:16px;" />
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
        <div><span style="color:var(--text-muted);">Employee:</span> <strong>${slip.employee_name || currentUser.name}</strong></div>
        <div><span style="color:var(--text-muted);">Period:</span> <strong>${period}</strong></div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:0.84rem;">
        <tr style="background:var(--bg-surface-2);">
          <td style="padding:8px 12px;font-weight:600;color:var(--text-secondary);">Component</td>
          <td style="padding:8px 12px;font-weight:600;color:var(--text-secondary);text-align:right;">Amount</td>
        </tr>
        <tr><td style="padding:8px 12px;border-bottom:1px solid var(--border);">Basic Salary</td><td style="padding:8px 12px;border-bottom:1px solid var(--border);text-align:right;">₹${Number(slip.basic_salary).toLocaleString()}</td></tr>
        <tr><td style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--success);">Allowances</td><td style="padding:8px 12px;border-bottom:1px solid var(--border);text-align:right;color:var(--success);">+ ₹${Number(slip.allowances || 0).toLocaleString()}</td></tr>
        <tr><td style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--danger);">Deductions</td><td style="padding:8px 12px;border-bottom:1px solid var(--border);text-align:right;color:var(--danger);">- ₹${Number(slip.deductions || 0).toLocaleString()}</td></tr>
        <tr style="background:var(--accent-light);">
          <td style="padding:10px 12px;font-weight:800;color:var(--accent);">Net Salary</td>
          <td style="padding:10px 12px;font-weight:800;color:var(--accent);text-align:right;">₹${Number(slip.net_salary).toLocaleString()}</td>
        </tr>
      </table>
      <div style="margin-top:16px;font-size:0.73rem;color:var(--text-muted);text-align:center;">
        This is a computer-generated payslip — no signature required.
      </div>
    </div>`;
  document.getElementById('payslipPreviewContent').innerHTML = html;
  document.getElementById('payslipPreviewModal').classList.remove('hidden');
  // Store slip for print
  window._currentPayslip = slip;
}

function printPayslip() {
  const content = document.getElementById('payslipPreviewContent').innerHTML;
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>Payslip</title>
    <style>
      body { font-family: 'DM Sans', Arial, sans-serif; padding: 32px; color: #0f0d1a; }
      table { width:100%; border-collapse:collapse; }
      td { padding:8px 12px; border-bottom:1px solid #e2e8f0; }
      hr { border-color:#e2e8f0; }
    </style>
    </head><body>${content}</body></html>`);
  win.document.close();
  win.print();
}

// Reuse deadline badge helper from dept_head.js pattern
function getDeadlineBadge(deadline, status) {
  if (!deadline) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const dDay  = new Date(deadline + 'T00:00:00');
  const diff  = Math.round((dDay - today) / (1000*60*60*24));
  if (status === 'Closed' || status === 'Waiting Confirmation') {
    return diff < 0 ? `<span class="deadline-badge overdue">Deadline crossed</span>` : '';
  }
  if (diff < 0) return `<span class="deadline-badge overdue">${Math.abs(diff)}d overdue</span>`;
  if (diff === 0) return `<span class="deadline-badge due-today">Due today</span>`;
  if (diff <= 2)  return `<span class="deadline-badge soon">${diff}d left</span>`;
  return `<span class="deadline-badge normal">${diff}d left</span>`;
}
