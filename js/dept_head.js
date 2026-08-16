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
  } catch (err) {
    console.error(err);
  }
}

// ─── LOAD COMPLAINTS ─────────────────────────────────────────
let complaintsData = [];

async function loadComplaints() {
  try {
    const statusFilt = document.getElementById('filterStatus').value;
    let url = '/depthead/complaints';
    if (statusFilt) url += `?status=${encodeURIComponent(statusFilt)}`;
    
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
  } catch (err) {
    alert(err.message);
  }
}

async function markResolved(compId) {
  if (!confirm("Are you sure this is resolved? It will be sent to the student for confirmation.")) return;
  
  try {
    await apiFetch(`/depthead/complaints/${compId}/resolve`, { method: 'POST' });
    loadStats();
    loadComplaints();
    loadEmployees(); // Free up employee
  } catch (err) {
    alert(err.message);
  }
}

// ─── MANAGE EMPLOYEES ────────────────────────────────────────
function renderEmployees() {
  const tbody = document.getElementById('employeesBody');
  tbody.innerHTML = '';
  
  if (allEmployees.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No employees found.</td></tr>';
    return;
  }
  
  allEmployees.forEach(e => {
    let statColor = e.availability === 'Available' ? 'var(--green)' : 'var(--yellow)';
    
    tbody.innerHTML += `
      <tr>
        <td>EMP-${e.employee_id}</td>
        <td>
          <div style="font-weight:600; color:var(--text-primary); margin-bottom:2px;">${e.name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${e.email}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${e.phone || ''}</div>
        </td>
        <td>${e.designation}</td>
        <td style="color:${statColor}; font-size:0.8rem; font-weight:600;">${e.availability}</td>
        <td>
          <button class="action-btn" style="color:var(--red)" onclick="removeEmployee(${e.employee_id})">Remove</button>
        </td>
      </tr>
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
  } catch (err) {
    alert(err.message);
  }
}

async function removeEmployee(id) {
  if (!confirm("Are you sure you want to remove this employee?")) return;
  
  try {
    await apiFetch(`/depthead/employees/${id}`, { method: 'DELETE' });
    loadEmployees();
  } catch (err) {
    alert(err.message);
  }
}
