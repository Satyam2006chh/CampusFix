// ============================================================
//  CampusFix — Admin Dashboard Logic
//  File: js/admin.js
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (currentUser.role !== 'admin') {
    window.location.href = 'login.html';
    return;
  }
  
  loadStats();
  loadAllComplaints();
  loadDepartments();
  loadLocations();
  loadUsers();
});

// ─── LOAD STATS ──────────────────────────────────────────────
async function loadStats() {
  try {
    const data = await apiFetch('/admin/stats');
    
    // Top numbers
    document.getElementById('aStatTotal').textContent = data.stats.total || 0;
    document.getElementById('aStatPending').textContent = data.stats.pending || 0;
    document.getElementById('aStatInProgress').textContent = data.stats.in_progress || 0;
    document.getElementById('aStatResolved').textContent = data.stats.resolved || 0;
    
    // Dept table
    const dBody = document.getElementById('deptStatsBody');
    dBody.innerHTML = '';
    data.by_dept.forEach(d => {
      dBody.innerHTML += `<tr><td>${d.dept_name}</td><td>${d.count}</td></tr>`;
    });
    
    // Block table
    const bBody = document.getElementById('blockStatsBody');
    bBody.innerHTML = '';
    data.by_block.forEach(b => {
      bBody.innerHTML += `<tr><td>${b.block}</td><td>${b.count}</td></tr>`;
    });
    
  } catch (err) {
    console.error(err);
  }
}

// ─── LOAD COMPLAINTS ─────────────────────────────────────────
async function loadAllComplaints() {
  try {
    const filtDept = document.getElementById('filtDept').value;
    const filtStatus = document.getElementById('filtStatus').value;
    
    let url = '/admin/complaints?';
    if (filtDept) url += `dept_id=${filtDept}&`;
    if (filtStatus) url += `status=${filtStatus}`;
    
    const complaints = await apiFetch(url);
    const tbody = document.getElementById('globalComplaintsBody');
    tbody.innerHTML = '';
    
    if (complaints.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No complaints found.</td></tr>';
      return;
    }
    
    complaints.forEach(c => {
      tbody.innerHTML += `
        <tr>
          <td>#CF-${c.complaint_id}</td>
          <td>
            <div style="font-weight:600; color:var(--text-primary); margin-bottom:2px;">${c.title}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${c.block}, ${c.room_area}</div>
          </td>
          <td>${c.dept_name || 'Unassigned'}</td>
          <td>${getStatusBadge(c.status)}</td>
          <td>${formatDate(c.created_at)}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

// ─── LOAD DEPARTMENTS ────────────────────────────────────────
let allDepts = [];
async function loadDepartments() {
  try {
    allDepts = await apiFetch('/admin/departments');
    
    // Populate table
    const tbody = document.getElementById('deptsBody');
    tbody.innerHTML = '';
    
    // Populate dropdowns (filters & modals)
    const filtDept = document.getElementById('filtDept');
    const hDept = document.getElementById('hDept');
    filtDept.innerHTML = '<option value="">All Departments</option>';
    hDept.innerHTML = '<option value="" disabled selected>Select Dept</option>';
    
    allDepts.forEach(d => {
      tbody.innerHTML += `
        <tr>
          <td style="font-weight:600; color:var(--text-primary);">${d.name}</td>
          <td><span style="background:rgba(255,255,255,0.1); padding:2px 8px; border-radius:4px; font-size:0.75rem;">${d.category_tag}</span></td>
          <td>${d.head_name || '<span style="color:var(--yellow)">Unassigned</span>'}</td>
          <td>${d.head_email || '-'}</td>
          <td>${d.total_complaints}</td>
        </tr>
      `;
      
      filtDept.innerHTML += `<option value="${d.dept_id}">${d.name}</option>`;
      if (!d.head_name) {
        hDept.innerHTML += `<option value="${d.dept_id}">${d.name}</option>`;
      }
    });
  } catch (err) {
    console.error(err);
  }
}

// ─── LOAD LOCATIONS ──────────────────────────────────────────
async function loadLocations() {
  try {
    const locations = await apiFetch('/admin/locations');
    const tbody = document.getElementById('locationsBody');
    tbody.innerHTML = '';
    locations.forEach(l => {
      tbody.innerHTML += `
        <tr>
          <td>${l.campus}</td>
          <td>${l.block}</td>
          <td>${l.floor}</td>
          <td>${l.room_area}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

// ─── LOAD USERS ──────────────────────────────────────────────
async function loadUsers() {
  try {
    const roleFilt = document.getElementById('userFiltRole').value;
    let url = '/admin/users';
    if (roleFilt) url += `?role=${roleFilt}`;
    
    const users = await apiFetch(url);
    const tbody = document.getElementById('usersBody');
    tbody.innerHTML = '';
    
    users.forEach(u => {
      let statColor = u.is_active ? 'var(--green)' : 'var(--red)';
      let statText = u.is_active ? 'Active' : 'Deactivated';
      
      let actionBtn = '';
      if (u.role !== 'admin') {
        if (u.is_active) {
          actionBtn = `<button class="action-btn" style="color:var(--red)" onclick="toggleUserStatus(${u.user_id}, false)">Deactivate</button>`;
        } else {
          actionBtn = `<button class="action-btn" style="color:var(--green)" onclick="toggleUserStatus(${u.user_id}, true)">Activate</button>`;
        }
      }
      
      tbody.innerHTML += `
        <tr>
          <td style="font-weight:500;">${u.name}</td>
          <td>${u.email}</td>
          <td><span style="text-transform:uppercase; font-size:0.75rem; letter-spacing:0.05em; color:var(--purple-light)">${u.role.replace('_',' ')}</span></td>
          <td>${u.dept_name || '-'}</td>
          <td style="color:${statColor}; font-weight:600; font-size:0.8rem;">${statText}</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

async function toggleUserStatus(userId, activate) {
  if (!confirm(`Are you sure you want to ${activate ? 'activate' : 'deactivate'} this user?`)) return;
  const action = activate ? 'activate' : 'deactivate';
  try {
    await apiFetch(`/admin/users/${userId}/${action}`, { method: 'POST' });
    loadUsers();
    loadDepartments(); // To refresh head assignments if affected
  } catch (err) {
    alert(err.message);
  }
}

// ─── MODALS & SUBMISSIONS ────────────────────────────────────
function closeModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

function openAddDeptModal() { document.getElementById('addDeptModal').classList.remove('hidden'); }
function openAddHeadModal() { document.getElementById('addHeadModal').classList.remove('hidden'); }
function openLocModal()     { document.getElementById('addLocModal').classList.remove('hidden'); }

async function submitDept(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('dName').value,
    category_tag: document.getElementById('dTag').value,
    description: document.getElementById('dDesc').value
  };
  try {
    await apiFetch('/admin/departments', { method: 'POST', body: JSON.stringify(data) });
    closeModals();
    e.target.reset();
    loadDepartments();
  } catch (err) { alert(err.message); }
}

async function submitHead(e) {
  e.preventDefault();
  const data = {
    department_id: document.getElementById('hDept').value,
    name: document.getElementById('hName').value,
    email: document.getElementById('hEmail').value,
    password: document.getElementById('hPass').value,
    phone: document.getElementById('hPhone').value
  };
  try {
    await apiFetch('/admin/dept-heads', { method: 'POST', body: JSON.stringify(data) });
    closeModals();
    e.target.reset();
    loadDepartments();
    loadUsers();
  } catch (err) { alert(err.message); }
}

async function submitLoc(e) {
  e.preventDefault();
  const data = {
    campus: document.getElementById('lCampus').value,
    block: document.getElementById('lBlock').value,
    floor: document.getElementById('lFloor').value,
    room_area: document.getElementById('lRoom').value
  };
  try {
    await apiFetch('/admin/locations', { method: 'POST', body: JSON.stringify(data) });
    closeModals();
    e.target.reset();
    loadLocations();
  } catch (err) { alert(err.message); }
}
