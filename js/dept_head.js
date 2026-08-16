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
    document.getElementById('statTotal').textContent = stats.total || 0;
    document.getElementById('statPending').textContent = stats.pending || 0;
    document.getElementById('statInProgress').textContent = stats.in_progress || 0;
    document.getElementById('statClosed').textContent = stats.closed || 0;
    document.getElementById('statReopened').textContent = stats.reopened || 0;
  } catch (err) {
    console.error(err);
  }
}

// ─── LOAD COMPLAINTS ─────────────────────────────────────────
let complaintsData = [];

async function loadComplaints() {
  try {
    const statusFilt = document.getElementById('filterStatus').value;
    const dateFilt = document.getElementById('filterDate').value;
    
    let url = '/depthead/complaints?';
    if (statusFilt) url += `status=${encodeURIComponent(statusFilt)}&`;
    if (dateFilt) url += `date=${encodeURIComponent(dateFilt)}`;
    
    complaintsData = await apiFetch(url);
    
    renderActionRequired();
    renderAllComplaints();
  } catch (err) {
    console.error(err);
  }
}

function renderActionRequired() {
  const tbody = document.getElementById('actionRequiredBody');
  tbody.innerHTML = '';
  
  // Filter for pending and reopened
  const actionReq = complaintsData.filter(c => c.status === 'Pending' || c.status === 'Reopened').slice(0, 5);
  
  if (actionReq.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No pending actions required.</td></tr>';
    return;
  }
  
  actionReq.forEach(c => {
    let uColor = c.urgency === 'High' ? 'var(--red)' : c.urgency === 'Medium' ? 'var(--yellow)' : 'var(--text-secondary)';
    
    tbody.innerHTML += `
      <tr>
        <td>#CF-${c.complaint_id}</td>
        <td>
          <div style="font-weight:600; color:var(--text-primary);">${c.title}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${c.block}, ${c.room_area}</div>
        </td>
        <td style="color:${uColor}; font-weight:600; font-size:0.8rem;">${c.urgency}</td>
        <td>${getStatusBadge(c.status)}</td>
        <td>${formatDate(c.created_at)}</td>
      </tr>
    `;
  });
}

function renderAllComplaints() {
  const tbody = document.getElementById('allComplaintsBody');
  tbody.innerHTML = '';
  
  if (complaintsData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No complaints found.</td></tr>';
    return;
  }
  
  complaintsData.forEach(c => {
    let uColor = c.urgency === 'High' ? 'var(--red)' : c.urgency === 'Medium' ? 'var(--yellow)' : 'var(--text-secondary)';
    
    let actionHtml = '-';
    if (c.status === 'Pending' || c.status === 'Reopened') {
      actionHtml = `<button class="action-btn" onclick="openAssignModal(${c.complaint_id})">Assign</button>`;
    } else if (c.status === 'In Progress') {
      actionHtml = `<button class="action-btn" onclick="markResolved(${c.complaint_id})" style="color:var(--green)">Mark Resolved</button>`;
    } else if (c.status === 'Waiting Confirmation') {
      actionHtml = `<span style="font-size:0.8rem; color:var(--text-secondary)">Awaiting Student</span>`;
    }
    
    tbody.innerHTML += `
      <tr>
        <td>#CF-${c.complaint_id}</td>
        <td>
          <div style="font-weight:600; color:var(--text-primary); margin-bottom:4px;">${c.title}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">${c.block}, ${c.room_area}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);">By: ${c.student_name}</div>
        </td>
        <td style="color:${uColor}; font-weight:600; font-size:0.8rem;">${c.urgency}</td>
        <td>${getStatusBadge(c.status)}</td>
        <td style="font-size:0.85rem; color:var(--text-secondary);">${c.assigned_to_name || 'Unassigned'}</td>
        <td>${actionHtml}</td>
      </tr>
    `;
  });
}

// ─── ASSIGNMENT MODAL ────────────────────────────────────────
let assignCompId = null;
let allEmployees = [];

async function loadEmployees() {
  try {
    allEmployees = await apiFetch('/depthead/employees');
    renderEmployees();
  } catch (err) {
    console.error(err);
  }
}

function openAssignModal(compId) {
  assignCompId = compId;
  const select = document.getElementById('assignSelect');
  select.innerHTML = '';
  
  // Only show available employees for assignment initially (or put them top)
  const available = allEmployees.filter(e => e.availability === 'Available');
  const busy = allEmployees.filter(e => e.availability === 'Busy');
  
  if (available.length === 0 && busy.length === 0) {
    select.innerHTML = '<option disabled>No employees added yet.</option>';
  }
  
  available.forEach(e => {
    select.innerHTML += `<option value="${e.employee_id}">${e.name} (Available)</option>`;
  });
  busy.forEach(e => {
    select.innerHTML += `<option value="${e.employee_id}">${e.name} (Busy)</option>`;
  });
  
  document.getElementById('assignModal').classList.remove('hidden');
}

function closeAssignModal() {
  document.getElementById('assignModal').classList.add('hidden');
  assignCompId = null;
}

async function submitAssignment() {
  const empId = document.getElementById('assignSelect').value;
  if (!empId) return;
  
  try {
    await apiFetch(`/depthead/complaints/${assignCompId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ employee_id: empId })
    });
    closeAssignModal();
    loadStats();
    loadComplaints();
    loadEmployees(); // Update availability status
    showCustomAlert('Task assigned successfully!');
  } catch (err) {
    showCustomAlert(err.message);
  }
}

async function markResolved(compId) {
  showCustomConfirm("Are you sure this is resolved? It will be sent to the student for confirmation.", async (confirmed) => {
    if (!confirmed) return;
    
    try {
      await apiFetch(`/depthead/complaints/${compId}/resolve`, { method: 'POST' });
      loadStats();
      loadComplaints();
      loadEmployees(); // Free up employee
      showCustomAlert('Complaint marked as resolved!');
    } catch (err) {
      showCustomAlert(err.message);
    }
  });
}

// ─── MANAGE EMPLOYEES ────────────────────────────────────────
function renderEmployees() {
  const grid = document.getElementById('employeesGrid');
  grid.innerHTML = '';
  
  if (allEmployees.length === 0) {
    grid.innerHTML = '<div style="text-align:center; width:100%; color:var(--text-muted);">No employees found.</div>';
    return;
  }
  
  allEmployees.forEach(e => {
    let statColor = e.availability === 'Available' ? 'var(--green)' : 'var(--yellow)';
    let initials = e.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    grid.innerHTML += `
      <div style="background:var(--bg-card); border:1px solid var(--border-light); border-radius:16px; padding:32px 24px; position:relative; box-shadow: 0 8px 24px rgba(0,0,0,0.15); display:flex; flex-direction:column; align-items:center; text-align:center; transition: transform 0.2s ease;">
        
        <div style="position:absolute; top:16px; left:16px; background:rgba(255,255,255,0.05); padding:4px 12px; border-radius:20px; font-size:0.7rem; color:var(--text-secondary); font-weight:600; letter-spacing:0.5px;">
          ${e.availability}
        </div>

        <div style="width:88px; height:88px; border-radius:50%; background:rgba(108, 99, 255, 0.1); display:flex; align-items:center; justify-content:center; font-weight:600; font-size:2rem; color:var(--purple); margin-top:12px; margin-bottom:20px;">
          ${initials}
        </div>

        <div style="font-weight:600; color:var(--text-primary); font-size:1.15rem; margin-bottom:6px;">${e.name}</div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:24px;">${e.designation}</div>

        <div style="display:flex; justify-content:center; gap:12px; width:100%;">
          <button class="btn-ghost" style="flex:1; padding:10px; font-size:0.85rem; background:rgba(255,255,255,0.03); border-radius:8px; display:flex; align-items:center; justify-content:center; gap:6px;" onclick='openEditEmpModal(${JSON.stringify(e).replace(/'/g, "&apos;")})'>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Edit
          </button>
          <button class="btn-ghost" style="flex:1; padding:10px; font-size:0.85rem; color:var(--red); background:rgba(255,92,122,0.05); border-radius:8px; display:flex; align-items:center; justify-content:center; gap:6px;" onclick="removeEmployee(${e.employee_id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Delete
          </button>
        </div>
      </div>
    `;
  });
}

function openEmpModal() {
  document.getElementById('empForm').reset();
  document.getElementById('empModal').classList.remove('hidden');
}

function closeEmpModal() {
  document.getElementById('empModal').classList.add('hidden');
}

async function submitEmployee(e) {
  e.preventDefault();
  
  const data = {
    name: document.getElementById('empName').value,
    email: document.getElementById('empEmail').value,
    password: document.getElementById('empPassword').value,
    designation: document.getElementById('empDesig').value,
    phone: document.getElementById('empPhone').value
  };
  
  try {
    await apiFetch('/depthead/employees', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    closeEmpModal();
    loadEmployees();
    showCustomAlert('Employee created/reactivated successfully!');
  } catch (err) {
    showCustomAlert(err.message);
  }
}

// Edit Employee Flow
function openEditEmpModal(e) {
  document.getElementById('editEmpId').value = e.employee_id;
  document.getElementById('editEmpName').value = e.name;
  document.getElementById('editEmpDesig').value = e.designation;
  document.getElementById('editEmpPhone').value = e.phone || '';
  
  document.getElementById('editEmpModal').classList.remove('hidden');
}

function closeEditEmpModal() {
  document.getElementById('editEmpModal').classList.add('hidden');
}

async function submitEditEmployee(event) {
  event.preventDefault();
  const id = document.getElementById('editEmpId').value;
  const data = {
    name: document.getElementById('editEmpName').value,
    designation: document.getElementById('editEmpDesig').value,
    phone: document.getElementById('editEmpPhone').value
  };
  
  try {
    await apiFetch(`/depthead/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    closeEditEmpModal();
    loadEmployees();
    showCustomAlert('Employee details updated!');
  } catch (err) {
    showCustomAlert(err.message);
  }
}

async function removeEmployee(id) {
  showCustomConfirm("Are you sure you want to remove this employee?", async (confirmed) => {
    if (!confirmed) return;
    
    try {
      await apiFetch(`/depthead/employees/${id}`, { method: 'DELETE' });
      loadEmployees();
      showCustomAlert('Employee removed successfully!');
    } catch (err) {
      showCustomAlert(err.message);
    }
  });
}
