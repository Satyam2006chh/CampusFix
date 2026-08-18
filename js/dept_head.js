// ============================================================
//  CampusFix — Dept Head Dashboard Logic
//  File: js/dept_head.js
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (currentUser.role !== 'dept_head') {
    window.location.href = 'login.html';
    return;
  }
  loadStats();
  loadComplaints();
  loadEmployees();
});

// ─── LOAD STATS ──────────────────────────────────────────────
async function loadStats() {
  try {
    const stats = await apiFetch('/depthead/stats');
    document.getElementById('statTotal').textContent     = stats.total      || 0;
    document.getElementById('statPending').textContent   = stats.pending    || 0;
    document.getElementById('statInProgress').textContent = stats.in_progress || 0;
    document.getElementById('statClosed').textContent    = stats.closed     || 0;
    document.getElementById('statReopened').textContent  = stats.reopened   || 0;
    const overdueEl = document.getElementById('statOverdue');
    if (overdueEl) overdueEl.textContent = stats.overdue || 0;
  } catch (err) { console.error(err); }
}

// ─── LOAD COMPLAINTS ─────────────────────────────────────────
let complaintsData = [];

async function loadComplaints() {
  try {
    const statusFilt = document.getElementById('filterStatus').value;
    const dateFilt   = document.getElementById('filterDate').value;
    let url = '/depthead/complaints?';
    if (statusFilt) url += `status=${encodeURIComponent(statusFilt)}&`;
    if (dateFilt)   url += `date=${encodeURIComponent(dateFilt)}`;
    complaintsData = await apiFetch(url);
    renderActionRequired();
    renderAllComplaints();
  } catch (err) { console.error(err); }
}

function renderActionRequired() {
  const tbody = document.getElementById('actionRequiredBody');
  tbody.innerHTML = '';
  const actionReq = complaintsData
    .filter(c => c.status === 'Pending' || c.status === 'Reopened' || c.status === 'Overdue')
    .slice(0, 5);
  if (actionReq.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No pending actions.</td></tr>';
    return;
  }
  actionReq.forEach(c => {
    const rowStyle = c.status === 'Overdue' ? ' style="background:var(--danger-bg);"' : '';
    tbody.innerHTML += `
      <tr${rowStyle}>
        <td>#CF-${c.complaint_id}</td>
        <td>
          <strong>${c.title}</strong>
          <small>${c.block}, ${c.room_area}</small>
        </td>
        <td><span class="urgency-${(c.urgency||'').toLowerCase()}">${c.urgency}</span></td>
        <td>${getStatusBadge(c.status)}${getDeadlineBadge(c.deadline, c.status)}</td>
        <td>${formatDate(c.created_at)}</td>
      </tr>`;
  });
}

function renderAllComplaints() {
  const tbody = document.getElementById('allComplaintsBody');
  tbody.innerHTML = '';
  if (complaintsData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No complaints found.</td></tr>';
    return;
  }
  complaintsData.forEach(c => {
    const isOverdue = c.status === 'Overdue';
    const rowStyle  = isOverdue ? ' style="background:var(--danger-bg);"' : '';

    let actionHtml = '<span style="color:var(--text-muted);font-size:0.8rem;">—</span>';
    if (c.status === 'Pending' || c.status === 'Reopened') {
      actionHtml = `<button class="action-btn" onclick="openAssignModal(${c.complaint_id})">Assign</button>`;
    } else if (c.status === 'In Progress' || c.status === 'Overdue') {
      actionHtml = `<button class="action-btn" onclick="markResolved(${c.complaint_id})"
        style="color:var(--success); border-color:rgba(16,185,129,0.3);">Mark Resolved</button>`;
    } else if (c.status === 'Waiting Confirmation') {
      actionHtml = `<span style="font-size:0.78rem;color:var(--text-muted);">Awaiting Student</span>`;
    }

    const upvoteBadge = c.upvote_count > 0
      ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:0.72rem;
           background:var(--accent-light);color:var(--accent);
           padding:2px 7px;border-radius:20px;margin-left:6px;font-weight:600;">
           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
             <polyline points="18 15 12 9 6 15"/>
           </svg>${c.upvote_count}</span>`
      : '';

    tbody.innerHTML += `
      <tr${rowStyle}>
        <td>#CF-${c.complaint_id}</td>
        <td>
          <strong>${c.title}</strong>${upvoteBadge}
          <small>${c.block}, ${c.room_area}</small>
          <small>By: ${c.student_name}</small>
        </td>
        <td><span class="urgency-${(c.urgency||'').toLowerCase()}">${c.urgency}</span></td>
        <td>
          ${getStatusBadge(c.status)}
          ${getDeadlineBadge(c.deadline, c.status)}
        </td>
        <td style="font-size:0.84rem;color:var(--text-secondary);">${c.assigned_to_name || 'Unassigned'}</td>
        <td>${actionHtml}</td>
      </tr>`;
  });
}

// ─── DEADLINE BADGE HELPER ───────────────────────────────────
function getDeadlineBadge(deadline, status) {
  if (!deadline) return '';

  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  const dDay   = new Date(deadline + 'T00:00:00');
  const diffMs = dDay - today;
  const diff   = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (status === 'Overdue' || diff < 0) {
    const n = Math.abs(diff);
    return `<span class="deadline-badge overdue">🔴 ${n} day${n !== 1 ? 's' : ''} overdue</span>`;
  } else if (diff === 0) {
    return `<span class="deadline-badge due-today">⚠️ Due today</span>`;
  } else if (diff <= 2) {
    return `<span class="deadline-badge soon">⏳ ${diff} day${diff !== 1 ? 's' : ''} left</span>`;
  } else {
    return `<span class="deadline-badge normal">📅 ${diff} days left</span>`;
  }
}

// ─── MARK RESOLVED ───────────────────────────────────────────
async function markResolved(compId) {
  // FIX: use 3-arg signature (title, message, callback)
  showCustomConfirm(
    'Mark as Resolved',
    'Mark this complaint as resolved? The student will be asked to confirm the fix.',
    async () => {
      try {
        await apiFetch(`/depthead/complaints/${compId}/resolve`, { method: 'POST' });
        loadStats();
        loadComplaints();
        loadEmployees();
        showCustomAlert('Done', 'Complaint sent to student for confirmation.');
      } catch (err) {
        showCustomAlert('Error', err.message || 'Something went wrong.');
      }
    }
  );
}

// ─── ASSIGNMENT MODAL ────────────────────────────────────────
let assignCompId = null;
let allEmployees = [];

async function loadEmployees() {
  try {
    allEmployees = await apiFetch('/depthead/employees');
    renderEmployees();
  } catch (err) { console.error(err); }
}

function openAssignModal(compId) {
  assignCompId = compId;
  const select = document.getElementById('assignSelect');
  select.innerHTML = '';
  const available = allEmployees.filter(e => e.availability === 'Available');
  const busy      = allEmployees.filter(e => e.availability === 'Busy');
  if (available.length === 0 && busy.length === 0) {
    select.innerHTML = '<option disabled>No employees added yet.</option>';
  }

  // Group label for available
  if (available.length > 0) {
    const grpA = document.createElement('optgroup');
    grpA.label = '🟢 Available';
    available.forEach(e => {
      const ow = e.overdue_count > 0 ? ` · ⚠️ ${e.overdue_count} overdue` : '';
      const opt = document.createElement('option');
      opt.value = e.employee_id;
      opt.textContent = `${e.name} — ${e.designation}${ow}`;
      opt.dataset.status = 'available';
      grpA.appendChild(opt);
    });
    select.appendChild(grpA);
  }

  // Group label for busy
  if (busy.length > 0) {
    const grpB = document.createElement('optgroup');
    grpB.label = '🔴 Busy';
    busy.forEach(e => {
      const ow = e.overdue_count > 0 ? ` · ⚠️ ${e.overdue_count} overdue` : '';
      const opt = document.createElement('option');
      opt.value = e.employee_id;
      opt.textContent = `${e.name} — ${e.designation}${ow}`;
      opt.dataset.status = 'busy';
      grpB.appendChild(opt);
    });
    select.appendChild(grpB);
  }

  // Update dot indicator when selection changes
  updateAssignDot(select);
  select.onchange = () => updateAssignDot(select);

  // Default deadline = today + 3 days
  setDeadlineDays(3);
  document.getElementById('assignModal').classList.remove('hidden');
}

// Shows a colored dot next to the select based on selected option's status
function updateAssignDot(select) {
  const dot = document.getElementById('assignStatusDot');
  if (!dot) return;
  const selected = select.options[select.selectedIndex];
  const status = selected ? selected.dataset.status : '';
  if (status === 'available') {
    dot.style.background = 'var(--success)';
    dot.title = 'Available';
  } else if (status === 'busy') {
    dot.style.background = 'var(--warning)';
    dot.title = 'Busy';
  } else {
    dot.style.background = 'var(--border)';
    dot.title = '';
  }
}

// ─── DEADLINE QUICK-SET HELPER ───────────────────────────────
function setDeadlineDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const iso = d.toISOString().split('T')[0];
  const el = document.getElementById('assignDeadline');
  if (el) el.value = iso;
}

function closeAssignModal() {
  document.getElementById('assignModal').classList.add('hidden');
  assignCompId = null;
}

async function submitAssignment() {
  const empId    = document.getElementById('assignSelect').value;
  const deadlineEl = document.getElementById('assignDeadline');
  const deadline = deadlineEl ? (deadlineEl.value || null) : null;
  if (!empId) return;
  try {
    await apiFetch(`/depthead/complaints/${assignCompId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ employee_id: empId, deadline: deadline })
    });
    closeAssignModal();
    loadStats();
    loadComplaints();
    loadEmployees();
    showCustomAlert('Assigned', 'Task assigned to employee successfully.');
  } catch (err) {
    showCustomAlert('Error', err.message);
  }
}

// ─── EMPLOYEES GRID ──────────────────────────────────────────
function renderEmployees() {
  const grid = document.getElementById('employeesGrid');
  grid.innerHTML = '';
  if (allEmployees.length === 0) {
    grid.innerHTML = '<div style="text-align:center;width:100%;color:var(--text-muted);padding:40px;">No employees added yet.</div>';
    return;
  }
  allEmployees.forEach(e => {
    const initials   = e.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const isAvail    = e.availability === 'Available';
    const hasOverdue = (e.overdue_count || 0) > 0;
    const cardStyle  = hasOverdue ? 'border-color:var(--warning);box-shadow:0 0 0 1px var(--warning),var(--shadow-xs);' : '';

    const overdueTag = hasOverdue
      ? `<span class="employee-overdue-tag">⚠️ ${e.overdue_count} overdue task${e.overdue_count !== 1 ? 's' : ''}</span>`
      : '';

    grid.innerHTML += `
      <div class="employee-card" style="${cardStyle}">
        <div class="employee-card-top">
          <div class="employee-avatar">${initials}</div>
          <div>
            <div class="employee-name">${e.name}</div>
            <div class="employee-desig">${e.designation}</div>
            ${overdueTag}
          </div>
          <span class="employee-status ${isAvail ? 'available' : 'busy'}">${e.availability}</span>
        </div>
        <div class="employee-card-footer">
          <button class="action-btn" onclick='openEditEmpModal(${JSON.stringify(e).replace(/'/g,"&apos;")})'>Edit</button>
          <button class="action-btn danger" onclick="removeEmployee(${e.employee_id})">Remove</button>
        </div>
      </div>`;
  });
}

function openEmpModal() {
  document.getElementById('empForm').reset();
  clearAllErrors(document.getElementById('empForm'));
  document.getElementById('empModal').classList.remove('hidden');
  // Inject strength meter once (idempotent)
  injectPasswordMeter('empPassword', 'emp-pw-meter');
}
function closeEmpModal() {
  document.getElementById('empModal').classList.add('hidden');
  clearAllErrors(document.getElementById('empForm'));
}

async function submitEmployee(e) {
  e.preventDefault();
  clearAllErrors(document.getElementById('empForm'));

  // ── Validation ──────────────────────────────────────────
  let ok = true;
  ok = validateRequired('empName',  'Full name')    && ok;
  ok = validateEmail('empEmail')                    && ok;
  ok = validateStrongPassword('empPassword')        && ok;
  ok = validateRequired('empDesig', 'Designation')  && ok;
  ok = validatePhone('empPhone')                    && ok;
  if (!ok) return;
  // ────────────────────────────────────────────────────────

  const data = {
    name: document.getElementById('empName').value,
    email: document.getElementById('empEmail').value,
    password: document.getElementById('empPassword').value,
    designation: document.getElementById('empDesig').value,
    phone: document.getElementById('empPhone').value
  };
  try {
    await apiFetch('/depthead/employees', { method: 'POST', body: JSON.stringify(data) });
    closeEmpModal();
    loadEmployees();
    showCustomAlert('Added', 'Employee created successfully.');
  } catch (err) {
    showCustomAlert('Error', err.message);
  }
}

function openEditEmpModal(e) {
  document.getElementById('editEmpId').value    = e.employee_id;
  document.getElementById('editEmpName').value  = e.name;
  document.getElementById('editEmpDesig').value = e.designation;
  document.getElementById('editEmpPhone').value = e.phone || '';
  document.getElementById('editEmpModal').classList.remove('hidden');
}
function closeEditEmpModal() {
  document.getElementById('editEmpModal').classList.add('hidden');
  clearAllErrors(document.getElementById('editEmpForm'));
}

async function submitEditEmployee(event) {
  event.preventDefault();
  clearAllErrors(document.getElementById('editEmpForm'));

  // ── Validation ──────────────────────────────────────────
  let ok = true;
  ok = validateRequired('editEmpName',  'Full name')   && ok;
  ok = validateRequired('editEmpDesig', 'Designation') && ok;
  ok = validatePhone('editEmpPhone')                   && ok;
  if (!ok) return;
  // ────────────────────────────────────────────────────────

  const id   = document.getElementById('editEmpId').value;
  const data = {
    name: document.getElementById('editEmpName').value,
    designation: document.getElementById('editEmpDesig').value,
    phone: document.getElementById('editEmpPhone').value
  };
  try {
    await apiFetch(`/depthead/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    closeEditEmpModal();
    loadEmployees();
    showCustomAlert('Updated', 'Employee details saved.');
  } catch (err) {
    showCustomAlert('Error', err.message);
  }
}

async function removeEmployee(id) {
  showCustomConfirm(
    'Remove Employee',
    'Are you sure you want to remove this employee? This action cannot be undone.',
    async () => {
      try {
        await apiFetch(`/depthead/employees/${id}`, { method: 'DELETE' });
        loadEmployees();
        showCustomAlert('Removed', 'Employee removed successfully.');
      } catch (err) {
        showCustomAlert('Error', err.message);
      }
    }
  );
}
