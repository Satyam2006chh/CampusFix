/* ============================================================
   CampusFix – Dept Head Extra Features
   dept_head_extra.js — Attendance, Leaves, Payslips tabs
   Loaded after dept_head.js on dept_head_dashboard.html
   ============================================================ */

const MONTHS_DH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Called when tabs are switched ──────────────────────────
// We override / augment the existing switchTab from dashboard.js
const _origSwitchTab = window.switchTab;
window.switchTab = function(tabId) {
  if (typeof _origSwitchTab === 'function') _origSwitchTab(tabId);
  // Lazy-load tab data on first visit
  if (tabId === 'dh-my-attendance') loadHeadMyAttendance();
  if (tabId === 'dh-attendance')    loadDeptAttendance();
  if (tabId === 'dh-leaves')        loadDeptLeaves();
  if (tabId === 'dh-payslips')      { loadDeptPayslips(); populatePayslipEmpSelect(); }
};

// ── Populate employee filter on DOMContentLoaded ────────────
document.addEventListener('DOMContentLoaded', () => {
  // Check head's own attendance on load
  loadHeadMyAttendance();

  // Background polling for new employee leave applications once myDept is ready
  const deptCheckInterval = setInterval(() => {
    if (typeof myDept !== 'undefined' && myDept) {
      checkDeptPendingLeavesBadge(true);
      setInterval(() => {
        checkDeptPendingLeavesBadge(false);
      }, 10000);
      clearInterval(deptCheckInterval);
    }
  }, 800);

  // Populate filter select once myDept is ready (poll briefly)
  const interval = setInterval(() => {
    if (typeof allEmployees !== 'undefined' && allEmployees.length > 0) {
      populateAttEmpFilter();
      clearInterval(interval);
    }
  }, 600);
});

function populateAttEmpFilter() {
  const sel = document.getElementById('dhAttEmpFilter');
  if (!sel) return;
  sel.innerHTML = '<option value="">All Employees</option>';
  (allEmployees || []).forEach(e => {
    sel.innerHTML += `<option value="${e.id}">${e.name}</option>`;
  });
}

// ── DEPT HEAD OWN ATTENDANCE ──────────────────────────────
const CAMPUS_LAT = 30.5094;
const CAMPUS_LNG = 76.6566;
const CAMPUS_RADIUS = 500; // 500 metres geofence radius
let todayHeadRecord = null;

function getHeadDistanceMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getHeadCurrentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: CAMPUS_LAT, lng: CAMPUS_LNG, simulated: true });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => {
        console.warn('Geolocation fallback used:', err.message);
        resolve({ lat: CAMPUS_LAT, lng: CAMPUS_LNG, simulated: true });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}

function isHeadOnCampus(lat, lng) {
  const dist = getHeadDistanceMetres(lat, lng, CAMPUS_LAT, CAMPUS_LNG);
  return { onCampus: dist <= CAMPUS_RADIUS, distance: Math.round(dist) };
}

function getHeadTimeCategory(timeStr) {
  if (timeStr < '09:00') return { status: 'Present', label: 'On Time', isLate: false };
  if (timeStr <= '09:30') return { status: 'Late_1', label: 'Slightly Late', isLate: true };
  return { status: 'Late_2', label: 'Late', isLate: true };
}

function updateHeadClockBtn() {
  const btn = document.getElementById('dhHeadClockBtn');
  const label = document.getElementById('dhHeadClockBtnLabel');
  const banner = document.getElementById('dhHeadClockStatusBanner');
  const timeSpan = document.getElementById('dhHeadClockInTimeText');

  if (!btn || !label) return;

  if (!todayHeadRecord) {
    btn.disabled = false;
    btn.className = 'btn-primary';
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    label.textContent = 'Clock In';
    if (banner) banner.style.display = 'none';
  } else if (!todayHeadRecord.clock_out) {
    btn.disabled = false;
    btn.className = 'btn-primary';
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    btn.style.background = 'var(--danger, #ef4444)';
    label.textContent = 'Clock Out';
    if (banner) {
      banner.style.display = 'block';
      banner.style.borderColor = 'var(--success)';
      banner.style.background = 'var(--success-bg)';
      banner.style.color = 'var(--success)';
      if (timeSpan) timeSpan.textContent = todayHeadRecord.clock_in;
    }
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.65';
    btn.style.cursor = 'not-allowed';
    btn.style.background = 'var(--bg-tertiary)';
    btn.style.color = 'var(--text-muted)';
    label.textContent = 'Shift Completed';
    if (banner) {
      banner.style.display = 'block';
      banner.style.borderColor = 'var(--accent)';
      banner.style.background = 'rgba(99,102,241,0.08)';
      banner.style.color = 'var(--accent)';
      banner.innerHTML = `✓ You completed your shift today (${todayHeadRecord.clock_in} — ${todayHeadRecord.clock_out}, <strong>${todayHeadRecord.working_hours || 0} hrs</strong>).`;
    }
  }
}

async function loadHeadMyAttendance() {
  if (!currentUser || !currentUser.id) return;
  const tbody = document.getElementById('dhHeadMyAttendanceBody');
  if (!tbody) return;

  try {
    const records = await apiFetch(`/attendance?employee_id=${currentUser.id}`);
    const today = new Date().toISOString().split('T')[0];

    // Find today's record
    todayHeadRecord = (records || []).find(r => r.date === today) || null;
    updateHeadClockBtn();

    // Calculate monthly KPIs
    const currentYearMonth = today.slice(0, 7);
    const thisMonthRecords = (records || []).filter(r => r.date && r.date.startsWith(currentYearMonth));

    let presentDays = thisMonthRecords.length;
    let onTimeDays = thisMonthRecords.filter(r => r.status === 'Present').length;
    let lateDays = thisMonthRecords.filter(r => r.status === 'Late_1' || r.status === 'Late_2' || r.status === 'Late').length;
    let totalHours = thisMonthRecords.reduce((acc, r) => acc + (parseFloat(r.working_hours) || 0), 0);
    let avgHours = presentDays > 0 ? (totalHours / presentDays).toFixed(1) : '0.0';

    const pEl = document.getElementById('dhHeadPresentCount');
    const oEl = document.getElementById('dhHeadOnTimeCount');
    const lEl = document.getElementById('dhHeadLateCount');
    const aEl = document.getElementById('dhHeadAvgHours');
    if (pEl) pEl.textContent = presentDays;
    if (oEl) oEl.textContent = onTimeDays;
    if (lEl) lEl.textContent = lateDays;
    if (aEl) aEl.innerHTML = `${avgHours} <span style="font-size:0.9rem;font-weight:600;">Hrs</span>`;

    // Sort records descending by date
    const sorted = [...(records || [])].sort((a, b) => b.date.localeCompare(a.date));

    tbody.innerHTML = '';
    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No attendance records found yet. Click <strong>Clock In</strong> to begin today's shift!</td></tr>`;
      return;
    }

    sorted.forEach(r => {
      const statusClass = r.status === 'Present'
        ? 'status-closed'
        : (r.status === 'Late_1' || r.status === 'Late') ? 'status-pending'
        : 'status-reopened';
      const displayStatus = r.status === 'Late_1' ? 'Slightly Late'
        : r.status === 'Late_2' ? 'Late'
        : (r.status || 'Present');

      tbody.innerHTML += `
        <tr>
          <td style="font-weight:600;color:var(--text-primary);">${r.date}</td>
          <td>${r.clock_in || '—'}</td>
          <td>${r.clock_out || '—'}</td>
          <td>${r.working_hours ? r.working_hours.toFixed(1) + ' hrs' : (r.clock_out ? '0.0 hrs' : 'In Progress')}</td>
          <td><span style="font-size:0.8rem;color:var(--text-muted);background:var(--bg-tertiary);padding:3px 8px;border-radius:6px;">Regular</span></td>
          <td><span class="status-badge ${statusClass}">${displayStatus}</span></td>
        </tr>`;
    });
  } catch (err) {
    console.error('loadHeadMyAttendance error:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:24px;">Failed to load attendance records.</td></tr>`;
  }
}

async function handleHeadClockAction() {
  if (todayHeadRecord && todayHeadRecord.clock_out) {
    showCustomAlert('Shift Completed', 'You have already completed your attendance shift for today.');
    return;
  }

  const btn = document.getElementById('dhHeadClockBtn');
  const label = document.getElementById('dhHeadClockBtnLabel');
  if (btn) btn.disabled = true;
  if (label) label.textContent = 'Verifying Location…';

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5);

  let coords;
  try {
    coords = await getHeadCurrentPosition();
  } catch (err) {
    if (btn) btn.disabled = false;
    updateHeadClockBtn();
    showCustomAlert('Location Error', 'Unable to retrieve location coordinates.');
    return;
  }

  const { onCampus, distance } = isHeadOnCampus(coords.lat, coords.lng);

  if (!onCampus && !coords.simulated) {
    if (btn) btn.disabled = false;
    updateHeadClockBtn();
    showCustomAlert('📍 Campus Geofence Alert', `You appear to be ${distance}m away from Chitkara University campus.\nAttendance must be marked within campus grounds.`);
    return;
  }

  // Clock In
  if (!todayHeadRecord) {
    const { status, label: timeLabel, isLate } = getHeadTimeCategory(timeStr);
    const deptId = currentUser.department_id || (myDept && (myDept.id || myDept._id)) || null;

    try {
      const newRecord = await apiFetch('/attendance', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: currentUser.id,
          date: today,
          clock_in: timeStr,
          clock_in_lat: coords.lat,
          clock_in_lng: coords.lng,
          day_type: 'Regular',
          status,
          is_late: isLate,
          department_id: deptId ? String(deptId) : null,
        }),
      });

      todayHeadRecord = newRecord;
      updateHeadClockBtn();
      loadHeadMyAttendance();

      let msg = `Clocked in successfully at ${timeStr}.`;
      if (status === 'Present') msg += '\n✅ On time arrival.';
      else if (status === 'Late_1') msg += '\n🟡 Slightly late (9:00 - 9:30 AM).';
      else msg += '\n🔴 Late arrival (after 9:30 AM).';
      msg += '\nYour attendance record has been logged for Campus Admin review.';

      showCustomAlert(`Clock In — ${timeLabel}`, msg);
    } catch (err) {
      if (btn) btn.disabled = false;
      updateHeadClockBtn();
      showCustomAlert('Clock In Failed', err.message || 'Unable to record attendance.');
    }
  } else {
    // Clock Out
    const [inH, inM] = todayHeadRecord.clock_in.split(':').map(Number);
    const [outH, outM] = timeStr.split(':').map(Number);
    const rawHours = Math.max(0, ((outH * 60 + outM) - (inH * 60 + inM)) / 60);
    const effectiveHours = parseFloat(rawHours.toFixed(2));

    const finalStatus = effectiveHours < 4 && todayHeadRecord.status === 'Present'
      ? 'Early Departure'
      : todayHeadRecord.status || 'Present';

    try {
      const recId = todayHeadRecord.id || todayHeadRecord._id;
      const updated = await apiFetch(`/attendance/${recId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          clock_out: timeStr,
          clock_out_lat: coords.lat,
          clock_out_lng: coords.lng,
          working_hours: effectiveHours,
          status: finalStatus,
        }),
      });

      todayHeadRecord = updated;
      updateHeadClockBtn();
      loadHeadMyAttendance();

      showCustomAlert('Shift Completed', `Clocked out at ${timeStr}.\nTotal shift: ${effectiveHours} hours.\nAttendance record updated.`);
    } catch (err) {
      if (btn) btn.disabled = false;
      updateHeadClockBtn();
      showCustomAlert('Clock Out Failed', err.message || 'Unable to clock out.');
    }
  }
}

// ── ATTENDANCE (Dept Head view) ───────────────────────────
async function loadDeptAttendance() {
  if (!myDept) return;
  try {
    const dateFilter = document.getElementById('dhAttDateFilter')?.value || '';
    const empFilter  = document.getElementById('dhAttEmpFilter')?.value  || '';

    // Build URL
    let url = '/attendance?';
    if (empFilter)  url += `employee_id=${empFilter}&`;
    if (dateFilter) url += `date=${dateFilter}&`;

    const records = await apiFetch(url.replace(/&$/, ''));

    // Filter to this department's employees
    const deptEmpIds = new Set((allEmployees || []).map(e => String(e.id)));
    const filtered = (records || []).filter(r => deptEmpIds.has(String(r.employee_id)));

    // Also sort by date desc
    filtered.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.clock_in || '').localeCompare(a.clock_in || '');
    });

    const tbody = document.getElementById('dhAttBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No records found.</td></tr>`;
      return;
    }

    filtered.forEach(r => {
      const emp = (allEmployees || []).find(e => String(e.id) === String(r.employee_id));
      const empName = emp ? emp.name : `Emp #${r.employee_id}`;
      const statusClass = r.status === 'Present'
        ? 'status-closed'
        : (r.status === 'Late_1' || r.status === 'Late') ? 'status-pending'
        : (r.status === 'Late_2' || r.status === 'Early Departure') ? 'status-reopened'
        : 'status-reopened';
      const displayStatus = r.status === 'Late_1' ? 'Slightly Late'
        : r.status === 'Late_2' ? 'Late'
        : (r.status || 'Present');

      const earlyNote = r.status === 'Early Departure' && r.off_campus_count
        ? `<small style="color:var(--danger);display:block;margin-top:2px;">Left campus ${r.off_campus_count}x (${r.off_campus_times})</small>`
        : '';

      tbody.innerHTML += `
        <tr>
          <td style="font-weight:600;color:var(--text-primary);">${empName}</td>
          <td>${r.date}</td>
          <td>${r.clock_in || '—'}</td>
          <td>${r.clock_out || '—'}</td>
          <td>${r.working_hours ? r.working_hours.toFixed(1) + ' hrs' : '—'}</td>
          <td>
            <span class="status-badge ${statusClass}">${displayStatus}</span>
            ${earlyNote}
          </td>
        </tr>`;
    });
  } catch (err) { console.error('loadDeptAttendance', err); }
}

// ── LEAVE REQUESTS (Dept Head view) ──────────────────────
function openHeadApplyLeaveModal() {
  const modal = document.getElementById('headApplyLeaveModal');
  if (!modal) return;
  const today = new Date().toISOString().split('T')[0];
  const fromEl = document.getElementById('headLeaveFrom');
  const toEl = document.getElementById('headLeaveTo');
  if (fromEl) { fromEl.min = today; fromEl.value = today; }
  if (toEl) { toEl.min = today; toEl.value = today; }
  modal.classList.remove('hidden');
}

function closeHeadApplyLeaveModal() {
  const modal = document.getElementById('headApplyLeaveModal');
  if (!modal) return;
  modal.classList.add('hidden');
  document.getElementById('headApplyLeaveForm')?.reset();
}

async function submitHeadLeave(e) {
  e.preventDefault();
  const leaveType = document.getElementById('headLeaveType')?.value;
  const fromDate  = document.getElementById('headLeaveFrom')?.value;
  const toDate    = document.getElementById('headLeaveTo')?.value;
  const reason    = (document.getElementById('headLeaveReason')?.value || '').trim();

  if (!leaveType || !fromDate || !toDate || !reason) {
    showCustomAlert('Missing Fields', 'Please fill in all leave application details.');
    return;
  }

  if (toDate < fromDate) {
    showCustomAlert('Invalid Dates', 'The end date cannot be earlier than the start date.');
    return;
  }

  const deptId = currentUser.department_id || (myDept && (myDept.id || myDept._id)) || null;

  const payload = {
    employee_id: currentUser.id,
    employee_name: currentUser.name,
    department_id: deptId ? String(deptId) : null,
    leave_type: leaveType,
    from_date: fromDate,
    to_date: toDate,
    reason,
  };

  try {
    await apiFetch('/leaves', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    closeHeadApplyLeaveModal();
    loadHeadMyLeaves();
    showCustomAlert('Leave Application Submitted', 'Your leave request has been submitted to the Campus Administrator for approval.');
  } catch (err) {
    showCustomAlert('Submission Error', err.message || 'Unable to submit leave request.');
  }
}

async function loadHeadMyLeaves() {
  if (!currentUser || !currentUser.id) return;
  const tbody = document.getElementById('dhMyLeavesBody');
  if (!tbody) return;

  try {
    const leaves = await apiFetch(`/leaves?employee_id=${currentUser.id}`);
    const sorted = (leaves || []).sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));

    tbody.innerHTML = '';
    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">You haven't submitted any leave applications yet. Click <strong>Apply for Leave</strong> above.</td></tr>`;
      return;
    }

    sorted.forEach(l => {
      const statusClass = l.status === 'Approved' ? 'status-closed' : l.status === 'Rejected' ? 'status-reopened' : 'status-pending';
      let adminReview = '—';
      if (l.status === 'Pending') {
        adminReview = `<span style="color:var(--text-muted);font-size:0.8rem;display:flex;align-items:center;gap:4px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Awaiting Admin Action
        </span>`;
      } else {
        const revDate = l.reviewed_at ? new Date(l.reviewed_at).toLocaleDateString() : '';
        adminReview = `<div style="font-size:0.82rem;font-weight:600;color:var(--text-primary);">${l.reviewed_by || 'Admin'}</div>
                       <div style="font-size:0.74rem;color:var(--text-muted);">${revDate}</div>`;
      }

      tbody.innerHTML += `
        <tr>
          <td style="font-weight:600;color:var(--text-primary);">${l.leave_type}</td>
          <td style="white-space:nowrap;">${l.from_date} → ${l.to_date}</td>
          <td style="max-width:220px;color:var(--text-secondary);">${l.reason}</td>
          <td><span class="status-badge ${statusClass}">${l.status}</span></td>
          <td>${adminReview}</td>
        </tr>`;
    });
  } catch (err) {
    console.error('loadHeadMyLeaves error:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--danger);padding:24px;">Failed to load your leave applications.</td></tr>`;
  }
}

let lastDeptPendingLeavesCount = null;

function updateDeptLeavesBadge(count) {
  const badge = document.getElementById('dhLeavesNavBadge');
  if (!badge) return;
  const num = Number(count) || 0;
  if (num > 0) {
    badge.textContent = num > 99 ? '99+' : num;
    badge.style.display = 'inline-flex';
    badge.title = `${num} pending employee leave application${num > 1 ? 's' : ''}`;
  } else {
    badge.style.display = 'none';
  }
}

async function checkDeptPendingLeavesBadge(silent = false) {
  if (!myDept) return;
  try {
    const deptId = String(myDept.id || myDept._id || '');
    const leaves = await apiFetch(`/leaves?department_id=${deptId}`);
    const staffLeaves = (leaves || []).filter(l => {
      const empId = l.employee_id && typeof l.employee_id === 'object'
        ? String(l.employee_id._id || l.employee_id.id)
        : String(l.employee_id);
      return empId !== String(currentUser.id);
    });
    const pendingCount = staffLeaves.filter(l => l.status === 'Pending').length;
    updateDeptLeavesBadge(pendingCount);

    if (lastDeptPendingLeavesCount !== null && pendingCount > lastDeptPendingLeavesCount && !silent) {
      if (typeof showToastNotification === 'function') {
        const latest = staffLeaves.find(l => l.status === 'Pending');
        const applicantName = latest?.employee_name || 'A staff member';
        showToastNotification(`🔔 <strong>${applicantName}</strong> submitted a leave application pending review.`, 'warning');
      }
      const activeTab = document.querySelector('.nav-item.active');
      if (activeTab && activeTab.dataset.tab === 'dh-leaves') {
        loadDeptLeaves();
      }
    }
    lastDeptPendingLeavesCount = pendingCount;
  } catch (err) {
    // Suppress background poll errors
  }
}

async function loadDeptLeaves() {
  if (!myDept) return;
  // Always load Head's own leaves too
  loadHeadMyLeaves();

  try {
    const deptId = String(myDept.id || myDept._id || '');
    const leaves = await apiFetch(`/leaves?department_id=${deptId}`);

    // Exclude the Dept Head's own requests from staff list
    const staffLeaves = (leaves || []).filter(l => {
      const empId = l.employee_id && typeof l.employee_id === 'object'
        ? String(l.employee_id._id || l.employee_id.id)
        : String(l.employee_id);
      return empId !== String(currentUser.id);
    });

    const pendingStaffCount = staffLeaves.filter(l => l.status === 'Pending').length;
    updateDeptLeavesBadge(pendingStaffCount);
    lastDeptPendingLeavesCount = pendingStaffCount;

    const sorted = staffLeaves.sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));

    const tbody = document.getElementById('dhLeaveBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No employee leave applications found.</td></tr>`;
      return;
    }

    sorted.forEach(l => {
      const statusClass = l.status === 'Approved' ? 'status-closed' : l.status === 'Rejected' ? 'status-reopened' : 'status-pending';
      const actionHtml = l.status === 'Pending'
        ? `<div style="display:flex;gap:6px;">
             <button class="action-btn" style="color:var(--success);border-color:rgba(16,185,129,0.3);" onclick="reviewLeave('${l.id}','Approved')">Approve</button>
             <button class="action-btn danger" onclick="reviewLeave('${l.id}','Rejected')">Reject</button>
           </div>`
        : `<span style="color:var(--text-muted);font-size:0.78rem;">${l.status}</span>`;

      tbody.innerHTML += `
        <tr>
          <td style="font-weight:600;color:var(--text-primary);">${l.employee_name || 'Employee'}</td>
          <td>${l.leave_type}</td>
          <td style="white-space:nowrap;">${l.from_date} → ${l.to_date}</td>
          <td style="max-width:200px;color:var(--text-secondary);">${l.reason}</td>
          <td><span class="status-badge ${statusClass}">${l.status}</span></td>
          <td>${actionHtml}</td>
        </tr>`;
    });
  } catch (err) { console.error('loadDeptLeaves', err); }
}

async function reviewLeave(leaveId, decision) {
  const action = decision === 'Approved' ? 'approve' : 'reject';
  showCustomConfirm(
    `${decision === 'Approved' ? 'Approve' : 'Reject'} Leave`,
    `Are you sure you want to ${action} this leave request?`,
    async () => {
      try {
        await apiFetch(`/leaves/${leaveId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: decision,
            reviewed_by:  currentUser.name,
            reviewed_at:  new Date().toISOString(),
          }),
        });
        loadDeptLeaves();
        showCustomAlert('Done', `Leave request has been ${decision.toLowerCase()}.`);
      } catch (err) {
        showCustomAlert('Error', err.message || 'Failed to update leave.');
      }
    }
  );
}

// ── PAYSLIPS (Dept Head view) ─────────────────────────────
async function loadHeadMyPayslips() {
  if (!currentUser || !currentUser.id) return;
  const tbody = document.getElementById('dhMyPayslipsBody');
  if (!tbody) return;

  try {
    const slips = await apiFetch(`/payslips?employee_id=${currentUser.id}`);
    const sorted = (slips || []).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });

    tbody.innerHTML = '';
    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No payslips have been issued for you by Super Admin yet.</td></tr>`;
      return;
    }

    sorted.forEach(s => {
      const period = `${MONTHS_DH[s.month - 1]} ${s.year}`;
      tbody.innerHTML += `
        <tr>
          <td style="font-weight:600;color:var(--text-primary);">${period}</td>
          <td>₹${Number(s.basic_salary).toLocaleString()}</td>
          <td style="color:var(--success);">+₹${Number(s.allowances || 0).toLocaleString()}</td>
          <td style="color:var(--danger);">-₹${Number(s.deductions || 0).toLocaleString()}</td>
          <td style="font-weight:700;color:var(--accent);">₹${Number(s.net_salary).toLocaleString()}</td>
          <td><span style="font-size:0.8rem;color:var(--text-muted);">${s.generated_by || 'Super Admin'}</span></td>
          <td>
            <button class="action-btn" onclick='dhDownloadPayslip(${JSON.stringify(s).replace(/'/g,"&apos;")})'>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
              Download
            </button>
          </td>
        </tr>`;
    });
  } catch (err) {
    console.error('loadHeadMyPayslips error:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger);padding:24px;">Failed to load your payslips.</td></tr>`;
  }
}

async function loadDeptPayslips() {
  if (!myDept) return;
  // Always load Head's own payslips too
  loadHeadMyPayslips();

  try {
    const deptId = String(myDept.id || myDept._id || '');
    const slips = await apiFetch(`/payslips?department_id=${deptId}`);

    // Exclude the Dept Head's own payslips from staff table
    const staffSlips = (slips || []).filter(s => {
      const empId = s.employee_id && typeof s.employee_id === 'object'
        ? String(s.employee_id._id || s.employee_id.id)
        : String(s.employee_id);
      return empId !== String(currentUser.id);
    });

    const sorted = staffSlips.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });

    const tbody = document.getElementById('dhPayslipBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px;">No employee payslips generated yet. Click <strong>+ Issue Staff Payslip</strong> to generate one.</td></tr>`;
      return;
    }

    sorted.forEach(s => {
      const period = `${MONTHS_DH[s.month - 1]} ${s.year}`;
      tbody.innerHTML += `
        <tr>
          <td style="font-weight:600;color:var(--text-primary);">${s.employee_name || '—'}</td>
          <td>${period}</td>
          <td>₹${Number(s.basic_salary).toLocaleString()}</td>
          <td style="font-weight:700;color:var(--accent);">₹${Number(s.net_salary).toLocaleString()}</td>
          <td>
            <button class="action-btn" onclick='dhDownloadPayslip(${JSON.stringify(s).replace(/'/g,"&apos;")})'>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
              Download
            </button>
          </td>
        </tr>`;
    });
  } catch (err) { console.error('loadDeptPayslips', err); }
}

function populatePayslipEmpSelect() {
  const sel = document.getElementById('psEmployee');
  if (!sel) return;
  sel.innerHTML = '<option value="" disabled selected>Select an employee</option>';
  (allEmployees || []).forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = e.name + (e.designation ? ` (${e.designation})` : '');
    opt.dataset.name = e.name;
    sel.appendChild(opt);
  });
}

// Live net salary preview — register after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  ['psBasic','psAllow','psDeduct'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateNetPreview);
  });
});
function updateNetPreview() {
  const basic  = parseFloat(document.getElementById('psBasic')?.value  || 0);
  const allow  = parseFloat(document.getElementById('psAllow')?.value  || 0);
  const deduct = parseFloat(document.getElementById('psDeduct')?.value || 0);
  const net    = basic + allow - deduct;
  const el     = document.getElementById('psNetPreview');
  if (el) el.textContent = `₹${Math.max(0, net).toLocaleString()}`;
}

function openPayslipModal() {
  populatePayslipEmpSelect();
  // Set current month/year
  const now = new Date();
  const mSel = document.getElementById('psMonth');
  const ySel = document.getElementById('psYear');
  if (mSel) mSel.value = now.getMonth() + 1;
  if (ySel) ySel.value = now.getFullYear();
  document.getElementById('payslipModal').classList.remove('hidden');
}
function closePayslipModal() {
  document.getElementById('payslipModal').classList.add('hidden');
  document.getElementById('payslipForm').reset();
  const el = document.getElementById('psNetPreview');
  if (el) el.textContent = '₹0';
}

async function submitPayslip(e) {
  e.preventDefault();
  clearAllErrors(document.getElementById('payslipForm'));

  const empSel = document.getElementById('psEmployee');
  const empId  = empSel.value;
  if (!empId) { showCustomAlert('Select Employee', 'Please choose an employee.'); return; }

  const empName  = empSel.options[empSel.selectedIndex]?.dataset.name || '';
  const month    = parseInt(document.getElementById('psMonth').value);
  const year     = parseInt(document.getElementById('psYear').value);
  const basic    = parseFloat(document.getElementById('psBasic').value);
  const allow    = parseFloat(document.getElementById('psAllow').value || 0);
  const deduct   = parseFloat(document.getElementById('psDeduct').value || 0);

  if (!basic || basic <= 0) {
    showFieldError('psBasic', 'Basic salary must be greater than 0.');
    return;
  }

  const payload = {
    employee_id:   empId,
    employee_name: empName,
    department_id: String(myDept.id || myDept._id || ''),
    month, year,
    basic_salary:  basic,
    allowances:    allow,
    deductions:    deduct,
    generated_by:  currentUser.name,
  };

  try {
    await apiFetch('/payslips', { method: 'POST', body: JSON.stringify(payload) });
    closePayslipModal();
    loadDeptPayslips();
    showCustomAlert('Payslip Generated', `Payslip for ${empName} (${MONTHS_DH[month-1]} ${year}) has been created.`);
  } catch (err) {
    showCustomAlert('Error', err.message || 'Failed to generate payslip.');
  }
}

function dhDownloadPayslip(slip) {
  const period = `${MONTHS_DH[slip.month - 1]} ${slip.year}`;
  const html = `
    <html><head><title>Payslip - ${slip.employee_name}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#0f0d1a;}
      h2{margin-bottom:4px;}
      .sub{color:#7c6b9a;font-size:0.82rem;margin-bottom:24px;}
      table{width:100%;border-collapse:collapse;margin-top:16px;}
      td{padding:10px 14px;border-bottom:1px solid #e2e8f0;}
      .net{background:#ede9f5;font-weight:700;color:#522377;}
      .footer{margin-top:24px;font-size:0.72rem;color:#7c6b9a;text-align:center;}
    </style></head><body>
    <h2>CampusFix — Payslip</h2>
    <div class="sub">${period} &nbsp;|&nbsp; ${slip.employee_name}</div>
    <table>
      <tr><td>Basic Salary</td><td>₹${Number(slip.basic_salary).toLocaleString()}</td></tr>
      <tr><td style="color:green;">Allowances</td><td style="color:green;">+ ₹${Number(slip.allowances||0).toLocaleString()}</td></tr>
      <tr><td style="color:red;">Deductions</td><td style="color:red;">- ₹${Number(slip.deductions||0).toLocaleString()}</td></tr>
      <tr class="net"><td>Net Salary</td><td>₹${Number(slip.net_salary).toLocaleString()}</td></tr>
    </table>
    <div class="footer">Generated by ${slip.generated_by || 'Dept Head'} &nbsp;|&nbsp; Computer-generated payslip</div>
    </body></html>`;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}
