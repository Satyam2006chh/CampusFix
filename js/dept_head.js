document.addEventListener('DOMContentLoaded', () => {
  if (currentUser.role !== 'dept_head') {
    window.location.href = 'login.html';
    return;
  }
  
  // First load the department info for this head, then load data
  initDeptHead();
});

let myDept = null;

async function initDeptHead() {
  try {
    
    const deptId = currentUser.department_id;
    if (!deptId) {
      console.error('No department_id on currentUser:', currentUser);
      showCustomAlert('Error', 'Your account has no department assigned. Please contact admin.');
      return;
    }
    myDept = await apiFetch(`/departments/${deptId}`);
    if (!myDept) {
      showCustomAlert('Error', 'Could not load department data.');
      return;
    }
    loadStats();
    loadComplaints();
    loadEmployees();
  } catch (err) {
    console.error('Failed to init dept head', err);
    showCustomAlert('Error', 'Failed to load dashboard data. Is the server running?');
  }
}

async function loadStats() {
  if (!myDept) return;
  try {
    const allComplaints = await apiFetch('/complaints');
    const myComplaints = allComplaints.filter(c => 
      c.category && myDept.category_tag && 
      c.category.toLowerCase() === myDept.category_tag.toLowerCase() &&
      c.source !== 'upvoted'
    );

    let total = myComplaints.length;
    let pending = 0, in_progress = 0, closed = 0, reopened = 0, overdue = 0;
    
    myComplaints.forEach(c => {
      if (c.status === 'Pending') pending++;
      else if (c.status === 'In Progress') in_progress++;
      else if (c.status === 'Closed' || c.status === 'Resolved' || c.status === 'Waiting Confirmation') closed++;
      else if (c.status === 'Reopened') reopened++;
      else if (c.status === 'Overdue') overdue++;
    });

    document.getElementById('statTotal').textContent      = total;
    document.getElementById('statPending').textContent    = pending;
    document.getElementById('statInProgress').textContent = in_progress;
    document.getElementById('statClosed').textContent     = closed;
    document.getElementById('statReopened').textContent   = reopened;
    const overdueEl = document.getElementById('statOverdue');
    if (overdueEl) overdueEl.textContent = overdue;
  } catch (err) { console.error(err); }
}

let complaintsData = [];

async function loadComplaints() {
  if (!myDept) return;
  try {
    const allComplaints = await apiFetch('/complaints');
    let filtered = allComplaints.filter(c =>
      c.source !== 'upvoted' &&
      c.category &&
      myDept.category_tag &&
      c.category.toLowerCase() === myDept.category_tag.toLowerCase()
    );

    const statusFilt = document.getElementById('filterStatus')
      ? document.getElementById('filterStatus').value
      : '';
    if (statusFilt) {
      filtered = filtered.filter(c => c.status === statusFilt);
    }

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    complaintsData = filtered;
    renderActionRequired();
    renderAllComplaints();
  } catch (err) { console.error(err); }
}

function renderActionRequired() {
  const tbody = document.getElementById('actionRequiredBody');
  if(!tbody) return;
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
    const locText = c.location_desc || `Loc ID: ${c.location_id}`;
    tbody.innerHTML += `
      <tr${rowStyle}>
        <td>#CF-${c.id}</td>
        <td>
          <strong>${c.title}</strong>
          <small>${locText}</small>
        </td>
        <td><span class="urgency-${(c.urgency||'').toLowerCase()}">${c.urgency}</span></td>
        <td>${getStatusBadge(c.status)}${getDeadlineBadge(c.deadline, c.status)}</td>
        <td>${formatDate(c.created_at)}</td>
      </tr>`;
  });
}

function renderAllComplaints() {
  const tbody = document.getElementById('allComplaintsBody');
  if(!tbody) return;
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
      actionHtml = `<button class="action-btn" onclick="openAssignModal('${c.id}')">Assign</button>`;
    } else if (c.status === 'In Progress' || c.status === 'Overdue') {
      actionHtml = `<button class="action-btn" onclick="markResolved('${c.id}')"
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

    const locText = c.location_desc || `Loc ID: ${c.location_id}`;
    
    tbody.innerHTML += `
      <tr${rowStyle}>
        <td>#CF-${c.id}</td>
        <td>
          <strong>${c.title}</strong>${upvoteBadge}
          <small>${locText}</small>
          <small>By: ${c.user_name || 'Student'}</small>
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

  if (status === 'Closed' || status === 'Resolved') {
    if (diff < 0) {
      return `<span class="deadline-badge overdue">Deadline crossed</span>`;
    }
    return '';
  }

  if (status === 'Overdue' || diff < 0) {
    const n = Math.abs(diff);
    return `<span class="deadline-badge overdue">${n} day${n !== 1 ? 's' : ''} overdue</span>`;
  } else if (diff === 0) {
    return `<span class="deadline-badge due-today">Due today</span>`;
  } else if (diff <= 2) {
    return `<span class="deadline-badge soon">${diff} day${diff !== 1 ? 's' : ''} left</span>`;
  } else {
    return `<span class="deadline-badge normal">${diff} days left</span>`;
  }
}

// ─── MARK RESOLVED ───────────────────────────────────────────
async function markResolved(compId) {
  showCustomConfirm(
    'Mark as Resolved',
    'Mark this complaint as resolved? The student will be asked to confirm the fix.',
    async () => {
      try {
        await apiFetch(`/complaints/${compId}`, { 
          method: 'PATCH',
          body: JSON.stringify({ status: 'Waiting Confirmation' })
        });
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
  if (!myDept) return;
  try {
    // Fetch ALL users — filter fully client-side to avoid json-server
    // type coercion issues (department_id stored as number OR string)
    const allUsers = await apiFetch('/users');
    allEmployees = allUsers.filter(u =>
      u.role === 'employee' &&
      String(u.department_id) === String(myDept.id)
    );
    renderEmployees();
  } catch (err) { console.error('loadEmployees error:', err); }
}

function openAssignModal(compId) {
  assignCompId = compId;
  const select = document.getElementById('assignSelect');
  select.innerHTML = '';

  const available = allEmployees.filter(e => e.availability === 'Available' || !e.availability);
  const busy      = allEmployees.filter(e => e.availability === 'Busy');

  if (available.length === 0 && busy.length === 0) {
    select.innerHTML = '<option value="" disabled>No employees in this department yet.</option>';
  }

  if (available.length > 0) {
    const grpA = document.createElement('optgroup');
    grpA.label = 'Available';
    available.forEach(e => {
      const opt = document.createElement('option');
      opt.value = String(e.id);              // always string
      opt.textContent = `${e.name} — ${e.designation || 'Staff'}`;
      opt.dataset.name   = e.name;
      opt.dataset.status = 'available';
      grpA.appendChild(opt);
    });
    select.appendChild(grpA);
  }

  if (busy.length > 0) {
    const grpB = document.createElement('optgroup');
    grpB.label = 'Busy';
    busy.forEach(e => {
      const opt = document.createElement('option');
      opt.value = String(e.id);
      opt.textContent = `${e.name} — ${e.designation || 'Staff'}`;
      opt.dataset.name   = e.name;
      opt.dataset.status = 'busy';
      grpB.appendChild(opt);
    });
    select.appendChild(grpB);
  }

  updateAssignDot(select);
  select.onchange = () => updateAssignDot(select);
  setDeadlineDays(3);
  document.getElementById('assignModal').classList.remove('hidden');
}

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
  const selectEl = document.getElementById('assignSelect');
  const empId    = selectEl.value;

  if (!empId) {
    showCustomAlert('Select Employee', 'Please select an employee before assigning.');
    return;
  }

  // Get employee name — from dataset, fallback to looking up allEmployees
  const selectedOpt = selectEl.options[selectEl.selectedIndex];
  let empName = selectedOpt ? selectedOpt.dataset.name : '';
  if (!empName) {
    const found = allEmployees.find(e => String(e.id) === String(empId));
    empName = found ? found.name : 'Unknown';
  }

  const deadlineEl = document.getElementById('assignDeadline');
  const deadline   = deadlineEl && deadlineEl.value ? deadlineEl.value : null;

  try {
    // Update the complaint
    await apiFetch(`/complaints/${assignCompId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        assigned_to_id:   empId,
        assigned_to_name: empName,
        deadline:         deadline,
        status:           'In Progress'
      })
    });

    // Mark employee as Busy
    await apiFetch(`/users/${empId}`, {
      method: 'PATCH',
      body: JSON.stringify({ availability: 'Busy' })
    });

    closeAssignModal();
    loadStats();
    loadComplaints();
    loadEmployees();
    showCustomAlert('Assigned', `Assigned to ${empName}${deadline ? ' — deadline: ' + deadline : ''}.`);
  } catch (err) {
    showCustomAlert('Error', err.message || 'Assignment failed. Please try again.');
  }
}

// ─── EMPLOYEES GRID ──────────────────────────────────────────
function renderEmployees() {
  const grid = document.getElementById('employeesGrid');
  if(!grid) return;
  grid.innerHTML = '';
  if (allEmployees.length === 0) {
    grid.innerHTML = '<div style="text-align:center;width:100%;color:var(--text-muted);padding:40px;">No employees added yet.</div>';
    return;
  }
  allEmployees.forEach(e => {
    const initials   = (e.name||"Emp").split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const isAvail    = e.availability === 'Available' || !e.availability;
    
    let deadlineCrossedCount = 0;
    const empComplaints = complaintsData.filter(c => String(c.assigned_to_id) === String(e.id));
    empComplaints.forEach(c => {
      if (c.deadline) {
        const today  = new Date();
        today.setHours(0, 0, 0, 0);
        const dDay   = new Date(c.deadline + 'T00:00:00');
        const diffMs = dDay - today;
        const diff   = Math.round(diffMs / (1000 * 60 * 60 * 24));
        
        if (c.status === 'Closed' || c.status === 'Resolved') {
          if (diff < 0) deadlineCrossedCount++;
        } else {
          if (diff < 0 || c.status === 'Overdue') deadlineCrossedCount++;
        }
      }
    });

    const deadlineBadgeHtml = deadlineCrossedCount > 0 
      ? `<div style="color:var(--danger); font-size:0.75rem; margin-top:5px; font-weight:600; display:flex; align-items:center; gap:4px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          Deadline crossed = ${deadlineCrossedCount}
         </div>`
      : '';
    
    grid.innerHTML += `
      <div class="employee-card">
        <div class="employee-card-top">
          <div class="employee-avatar">${initials}</div>
          <div>
            <div class="employee-name">${e.name}</div>
            <div class="employee-desig">${e.designation}</div>
            ${deadlineBadgeHtml}
          </div>
          <span class="employee-status ${isAvail ? 'available' : 'busy'}">${isAvail ? 'Available' : 'Busy'}</span>
        </div>
        <div class="employee-card-footer">
          <button class="action-btn" onclick='openEditEmpModal(${JSON.stringify(e).replace(/'/g,"&apos;")})'>Edit</button>
          <button class="action-btn danger" onclick="removeEmployee(${e.id})">Remove</button>
        </div>
      </div>`;
  });
}

function openEmpModal() {
  document.getElementById('empForm').reset();
  clearAllErrors(document.getElementById('empForm'));
  // Remove any leftover password meter from a previous open
  const oldMeter = document.getElementById('emp-pw-meter');
  if (oldMeter) oldMeter.remove();
  document.getElementById('empModal').classList.remove('hidden');
}
function closeEmpModal() {
  document.getElementById('empModal').classList.add('hidden');
  clearAllErrors(document.getElementById('empForm'));
}

async function submitEmployee(e) {
  e.preventDefault();
  clearAllErrors(document.getElementById('empForm'));

  // Simple validation — no strong password requirement for employee accounts
  // (they can change password after first login)
  let ok = true;
  ok = validateRequired('empName',  'Full name')   && ok;
  ok = validateEmail('empEmail')                   && ok;
  ok = validateRequired('empDesig', 'Designation') && ok;
  ok = validatePhone('empPhone')                   && ok;

  // Basic password: just needs to exist and be >= 6 chars
  const pwVal = (document.getElementById('empPassword')?.value || '').trim();
  if (!pwVal) {
    showFieldError('empPassword', 'Password is required.');
    ok = false;
  } else if (pwVal.length < 6) {
    showFieldError('empPassword', 'Password must be at least 6 characters.');
    ok = false;
  } else {
    clearFieldError('empPassword');
  }

  if (!ok) return;

  const data = {
    name:          document.getElementById('empName').value.trim(),
    email:         document.getElementById('empEmail').value.trim().toLowerCase(),
    password:      document.getElementById('empPassword').value,
    designation:   document.getElementById('empDesig').value.trim(),
    phone:         document.getElementById('empPhone').value.trim(),
    role:          'employee',
    department_id: myDept.id,
    availability:  'Available',
    is_active:     1
  };

  try {
    await apiFetch('/users', { method: 'POST', body: JSON.stringify(data) });
    closeEmpModal();
    loadEmployees();
    showCustomAlert('Employee Added', `${data.name} has been added to your department.`);
  } catch (err) {
    showCustomAlert('Error', err.message || 'Could not create employee. Please try again.');
  }
}

function openEditEmpModal(e) {
  document.getElementById('editEmpId').value    = e.id;
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

  let ok = true;
  ok = validateRequired('editEmpName',  'Full name')   && ok;
  ok = validateRequired('editEmpDesig', 'Designation') && ok;
  ok = validatePhone('editEmpPhone')                   && ok;
  if (!ok) return;

  const id   = document.getElementById('editEmpId').value;
  const data = {
    name: document.getElementById('editEmpName').value,
    designation: document.getElementById('editEmpDesig').value,
    phone: document.getElementById('editEmpPhone').value
  };
  try {
    await apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
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
        await apiFetch(`/users/${id}`, { method: 'DELETE' });
        loadEmployees();
        showCustomAlert('Removed', 'Employee removed successfully.');
      } catch (err) {
        showCustomAlert('Error', err.message);
      }
    }
  );
}
