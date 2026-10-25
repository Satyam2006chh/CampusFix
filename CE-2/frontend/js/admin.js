

document.addEventListener("DOMContentLoaded", () => {
  if (currentUser.role !== "admin") { window.location.href = "login.html"; return; }
  loadStats(); loadAllComplaints(); loadDepartments(); loadLocations(); loadUsers(); loadHeadAttendanceAnalytics();
});

async function loadStats() {
  try {
    let complaints = await apiFetch("/complaints");

    complaints = complaints.filter(c => c.source !== 'upvoted');

    const overviewFiltDept = document.getElementById("overviewFiltDept")?.value;
    if (overviewFiltDept) {
      const depts = await apiFetch("/departments");
      const dept = depts.find(d => String(d.id) === String(overviewFiltDept));
      if (dept) {
        complaints = complaints.filter(c => c.category && c.category.toLowerCase() === dept.category_tag.toLowerCase());
      }
    }

    let total = complaints.length;
    let pending = 0, in_progress = 0, resolved = 0;
    let by_dept  = {};
    let by_block = {};

    complaints.forEach(c => {
      if (c.status === 'Pending')   pending++;
      else if (c.status === 'In Progress') in_progress++;
      else if (c.status === 'Resolved' || c.status === 'Waiting Confirmation' || c.status === 'Closed') resolved++;

      const deptName = c.category || 'Unassigned';
      by_dept[deptName] = (by_dept[deptName] || 0) + 1;

      let block = 'Unknown';
      if (c.location_desc) block = c.location_desc.split(',')[0].trim();
      by_block[block] = (by_block[block] || 0) + 1;
    });

    document.getElementById("aStatTotal").textContent      = total;
    document.getElementById("aStatPending").textContent    = pending;
    document.getElementById("aStatInProgress").textContent = in_progress;
    document.getElementById("aStatResolved").textContent   = resolved;

    const dBody = document.getElementById("deptStatsBody");
    if (dBody) {
      dBody.innerHTML = "";
      Object.entries(by_dept)
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, count]) => {
          dBody.innerHTML += `<tr>
            <td style="color:var(--text-primary);font-weight:500;">${name}</td>
            <td style="font-weight:700;color:var(--accent);">${count}</td>
          </tr>`;
        });
    }

    const bBody = document.getElementById("blockStatsBody");
    if (bBody) {
      bBody.innerHTML = "";
      Object.entries(by_block)
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, count]) => {
          bBody.innerHTML += `<tr>
            <td style="color:var(--text-primary);font-weight:500;">${name}</td>
            <td style="font-weight:700;color:var(--accent);">${count}</td>
          </tr>`;
        });
    }
  } catch (err) { console.error(err); }
}

async function loadAllComplaints() {
  try {
    const filtDept   = document.getElementById("filtDept").value;
    const filtStatus = document.getElementById("filtStatus").value;

    let complaints = await apiFetch('/complaints');

    complaints = complaints.filter(c => c.source !== 'upvoted');

    if (filtStatus) {
      complaints = complaints.filter(c => c.status === filtStatus);
    }
    if (filtDept) {
      const depts = await apiFetch('/departments');
      const dept  = depts.find(d => d.id == filtDept);
      if (dept) {
        complaints = complaints.filter(c =>
          c.category && c.category.toLowerCase() === dept.category_tag.toLowerCase()
        );
      }
    }

    complaints.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const tbody = document.getElementById("globalComplaintsBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!complaints.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px;">No complaints found.</td></tr>';
      return;
    }

    complaints.forEach(c => {
      const locText = c.location_desc || `Loc ID: ${c.location_id}`;

      const upvoteBadge = (c.upvote_count > 0)
        ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:0.72rem;
             background:var(--accent-light);color:var(--accent);
             padding:2px 8px;border-radius:20px;margin-left:6px;font-weight:600;">
             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
               <polyline points="18 15 12 9 6 15"/>
             </svg>${c.upvote_count} upvote${c.upvote_count !== 1 ? 's' : ''}</span>`
        : '';

      tbody.innerHTML += `
        <tr>
          <td style="font-weight:600;color:var(--accent);">#CF-${c.id}</td>
          <td>
            <div style="font-weight:600;color:var(--text-primary);margin-bottom:2px;">
              ${c.title}${upvoteBadge}
            </div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${locText}</div>
          </td>
          <td style="color:var(--text-secondary);">${c.category || 'Unassigned'}</td>
          <td>${getStatusBadge(c.status)}</td>
          <td style="color:var(--text-secondary);">${formatDate(c.created_at)}</td>
        </tr>`;
    });
  } catch (err) { console.error(err); }
}

let allDepts = [];
async function loadDepartments() {
  try {
    allDepts = await apiFetch("/departments");
    const allUsers = await apiFetch("/users?role=dept_head");
    const allComplaints = await apiFetch("/complaints");

    const grid = document.getElementById("deptsGrid");
    const filtDept = document.getElementById("filtDept");
    const hDept = document.getElementById("hDept");
    const overviewFiltDept = document.getElementById("overviewFiltDept");
    
    if(filtDept) filtDept.innerHTML = '<option value="">All Departments</option>';
    if(overviewFiltDept) overviewFiltDept.innerHTML = '<option value="">All Departments</option>';
    if(hDept) hDept.innerHTML = '<option value="" disabled selected>Select Dept</option>';
    if(!grid) return;
    
    grid.innerHTML = "";
    if (!allDepts.length) { grid.innerHTML = '<p style="color:var(--text-muted);padding:24px;text-align:center;">No departments yet.</p>'; return; }
    
    allDepts.forEach(d => {
      const head = allUsers.find(u => u.department_id == d.id);
      
      const totalComplaints = allComplaints.filter(c => c.category && c.category.toLowerCase() === d.category_tag.toLowerCase()).length;

      const ini = d.name.split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase();
      const headBadge = head
        ? `<span style="color:var(--green);font-size:0.82rem;font-weight:600;">${head.name}</span><div style="font-size:0.73rem;color:var(--text-muted);margin-top:2px;">${head.email||""}</div>`
        : `<span style="color:var(--yellow);font-size:0.82rem;font-weight:600;">No Head Assigned</span>`;
      
      grid.innerHTML += `
        <div style="background:var(--bg-card);border:1px solid var(--border-light);border-radius:16px;padding:28px 22px;display:flex;flex-direction:column;box-shadow:0 8px 24px rgba(0,0,0,.15);transition:transform .2s ease;">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
            <div style="width:52px;height:52px;border-radius:14px;background:rgba(108,99,255,.12);border:1px solid rgba(108,99,255,.25);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;color:var(--purple);flex-shrink:0;">${ini}</div>
            <div><div style="font-weight:700;color:var(--text-primary);font-size:1rem;margin-bottom:5px;">${d.name}</div>
            <span style="background:rgba(255,255,255,.06);padding:2px 10px;border-radius:20px;font-size:.7rem;color:var(--text-secondary);font-weight:600;letter-spacing:.5px;">${d.category_tag}</span></div>
          </div>
          <div style="border-top:1px solid var(--border-light);padding-top:14px;margin-bottom:16px;">
            <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Department Head</div>
            ${headBadge}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;">
            <div style="font-size:.78rem;color:var(--text-muted);"><span style="color:var(--text-secondary);font-weight:600;">${totalComplaints}</span> issue${totalComplaints!==1?"s":""}</div>
            ${!head
              ? `<button onclick="openAddHeadModal()" style="background:rgba(108,99,255,.12);border:1px solid rgba(108,99,255,.3);color:var(--purple-light);padding:6px 14px;border-radius:8px;font-size:.78rem;font-weight:600;cursor:pointer;">+ Assign Head</button>`
              : `<button onclick='openEditHeadModal(${JSON.stringify(head).replace(/'/g,"&apos;")})' style="background:transparent;border:1px solid rgba(255,255,255,0.1);color:var(--text-secondary);padding:6px 14px;border-radius:8px;font-size:.78rem;font-weight:600;cursor:pointer;">Edit Head</button>`
            }
          </div>
        </div>`;
      
      if(filtDept) filtDept.innerHTML += `<option value="${d.id}">${d.name}</option>`;
      if(overviewFiltDept) overviewFiltDept.innerHTML += `<option value="${d.id}">${d.name}</option>`;
      if (!head && hDept) hDept.innerHTML += `<option value="${d.id}">${d.name}</option>`;
    });
  } catch (err) { console.error(err); }
}

async function loadLocations() {
  try {
    const locs = await apiFetch("/locations");
    const tbody = document.getElementById("locationsBody"); 
    if(!tbody) return;
    tbody.innerHTML = "";
    locs.forEach(l => { tbody.innerHTML += `<tr><td>${l.campus}</td><td>${l.block}</td><td>${l.floor}</td><td>${l.room_area}</td></tr>`; });
  } catch (err) { console.error(err); }
}

async function loadUsers() {
  try {
    const roleFilt = document.getElementById("userFiltRole") ? document.getElementById("userFiltRole").value : "";
    let url = "/users"; 
    if (roleFilt) url += `?role=${roleFilt}`;
    
    let users = await apiFetch(url);
    const depts = await apiFetch("/departments");
    
    const grid = document.getElementById("usersGrid"); 
    if(!grid) return;
    grid.innerHTML = "";
    if (!users.length) { grid.innerHTML = '<p style="color:var(--text-muted);padding:24px;text-align:center;">No users found.</p>'; return; }
    
    users.forEach(u => {
      let deptName = "";
      if (u.department_id) {
         const d = depts.find(x => x.id == u.department_id);
         if(d) deptName = d.name;
      }

      const ini = (u.name||"US").split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase();
      const isActive = u.is_active;
      const roleColor = u.role==="admin"?"#00d4ff":u.role==="dept_head"?"var(--yellow)":"var(--purple-light)";
      const roleLabel = u.role==="dept_head"?"Dept Head":u.role.charAt(0).toUpperCase()+u.role.slice(1);
      let actionBtn = "";
      
      if (u.role !== "admin") {
        actionBtn = isActive
          ? `<button onclick="toggleUserStatus('${u.id}',false)" style="flex:1;padding:9px;font-size:.8rem;background:rgba(255,92,122,.08);border:1px solid rgba(255,92,122,.2);color:var(--red);border-radius:8px;cursor:pointer;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>Deactivate</button>`
          : `<button onclick="toggleUserStatus('${u.id}',true)" style="flex:1;padding:9px;font-size:.8rem;background:rgba(0,229,160,.08);border:1px solid rgba(0,229,160,.2);color:var(--green);border-radius:8px;cursor:pointer;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Activate</button>`;
      }
      grid.innerHTML += `
        <div style="background:var(--bg-card);border:1px solid var(--border-light);border-radius:16px;padding:28px 22px;display:flex;flex-direction:column;align-items:center;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.15);position:relative;transition:transform .2s ease;">
          <div style="position:absolute;top:14px;right:14px;"><span style="background:${isActive?"rgba(0,229,160,.1)":"rgba(255,92,122,.1)"};color:${isActive?"var(--green)":"var(--red)"};padding:3px 10px;border-radius:20px;font-size:.68rem;font-weight:700;letter-spacing:.5px;">${isActive?"ACTIVE":"INACTIVE"}</span></div>
          <div style="width:78px;height:78px;border-radius:50%;background:rgba(108,99,255,.1);border:2px solid rgba(108,99,255,.2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.7rem;color:var(--purple);margin-top:10px;margin-bottom:16px;">${ini}</div>
          <div style="font-weight:700;color:var(--text-primary);font-size:1.05rem;margin-bottom:4px;">${u.name}</div>
          <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:12px;">${u.email}</div>
          <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;justify-content:center;">
            <span style="background:rgba(255,255,255,.05);color:${roleColor};padding:3px 12px;border-radius:20px;font-size:.72rem;font-weight:700;letter-spacing:.5px;">${roleLabel}</span>
            ${deptName?`<span style="background:rgba(255,255,255,.05);color:var(--text-secondary);padding:3px 12px;border-radius:20px;font-size:.72rem;">${deptName}</span>`:""}
          </div>
          ${actionBtn?`<div style="display:flex;width:100%;gap:8px;">${actionBtn}</div>`:`<div style="font-size:.78rem;color:var(--text-muted);background:rgba(255,255,255,.03);padding:8px 16px;border-radius:8px;width:100%;">System Administrator</div>`}
        </div>`;
    });
  } catch (err) { console.error(err); }
}

async function toggleUserStatus(userId, activate) {
  const action = activate ? 1 : 0;
  const label  = activate ? "Activate" : "Deactivate";
  showCustomConfirm(
    `${label} User`,
    `Are you sure you want to ${label.toLowerCase()} this user? ${!activate ? "They will be locked out immediately on their next login attempt." : "They will regain access immediately."}`,
    async () => {
      try {
        await apiFetch(`/users/${userId}`, { method: "PATCH", body: JSON.stringify({ is_active: action }) });
        showCustomAlert(`${label} User`, `User has been ${label.toLowerCase()}d successfully.`);
        loadUsers();
        loadDepartments();
      } catch (err) {
        showCustomAlert("Error", err.message || "Something went wrong.");
      }
    }
  );
}

function closeModals() { document.querySelectorAll(".modal").forEach(m=>m.classList.add("hidden")); }
function openAddDeptModal() { document.getElementById("addDeptModal").classList.remove("hidden"); }
function openAddHeadModal() {
  document.getElementById("addHeadModal").classList.remove("hidden");
  if(typeof injectPasswordMeter === 'function') injectPasswordMeter('hPass', 'head-pw-meter');
}
function openLocModal()     { document.getElementById("addLocModal").classList.remove("hidden"); }

async function submitDept(e) {
  e.preventDefault();
  clearAllErrors(e.target);
  let ok = true;
  ok = validateRequired('dName', 'Department name') && ok;
  ok = validateRequired('dTag',  'Category tag')    && ok;
  if (!ok) return;

  try {
    await apiFetch("/departments", {
      method:"POST", 
      body:JSON.stringify({
        name: document.getElementById("dName").value, 
        category_tag: document.getElementById("dTag").value, 
        description: document.getElementById("dDesc").value
      })
    });
    closeModals(); e.target.reset(); loadDepartments(); showCustomAlert("Success","Department added!");
  } catch (err) { showCustomAlert("Error", err.message||"Failed."); }
}

async function submitHead(e) {
  e.preventDefault();
  clearAllErrors(e.target);
  let ok = true;
  ok = validateSelect('hDept',    'department')   && ok;
  ok = validateRequired('hName',  'Name')         && ok;
  ok = validateEmail('hEmail')                    && ok;
  ok = validateStrongPassword('hPass')            && ok;
  ok = validatePhone('hPhone')                    && ok;
  if (!ok) return;

  try {
    await apiFetch("/users", {
      method:"POST", 
      body:JSON.stringify({
        department_id: parseInt(document.getElementById("hDept").value), 
        name: document.getElementById("hName").value, 
        email: document.getElementById("hEmail").value, 
        password: document.getElementById("hPass").value, 
        phone: document.getElementById("hPhone").value,
        role: "dept_head",
        is_active: 1
      })
    });
    closeModals(); e.target.reset(); loadDepartments(); loadUsers(); showCustomAlert("Success","Department Head assigned!");
  } catch (err) { showCustomAlert("Error", err.message||"Failed."); }
}

async function submitLoc(e) {
  e.preventDefault();
  clearAllErrors(e.target);
  let ok = true;
  ok = validateRequired('lCampus', 'Campus')    && ok;
  ok = validateRequired('lBlock',  'Block')     && ok;
  ok = validateRequired('lFloor',  'Floor')     && ok;
  ok = validateRequired('lRoom',   'Room/Area') && ok;
  if (!ok) return;

  try {
    await apiFetch("/locations", {
      method:"POST", 
      body:JSON.stringify({
        campus: document.getElementById("lCampus").value, 
        block: document.getElementById("lBlock").value, 
        floor: document.getElementById("lFloor").value, 
        room_area: document.getElementById("lRoom").value
      })
    });
    closeModals(); e.target.reset(); loadLocations(); showCustomAlert("Success","Location added!");
  } catch (err) { showCustomAlert("Error", err.message||"Failed."); }
}

function openEditHeadModal(headObj) {
  document.getElementById("editHeadId").value = headObj.id;
  document.getElementById("editHeadName").value = headObj.name || "";
  document.getElementById("editHeadEmail").value = headObj.email || "";
  document.getElementById("editHeadPhone").value = headObj.phone || "";
  document.getElementById("editHeadPass").value = ""; 
  document.getElementById("editHeadModal").classList.remove("hidden");
}

async function submitEditHead(e) {
  e.preventDefault();
  clearAllErrors(e.target);
  let ok = true;
  ok = validateRequired('editHeadName', 'Name') && ok;
  ok = validateEmail('editHeadEmail') && ok;
  ok = validatePhone('editHeadPhone') && ok;
  
  const pw = document.getElementById("editHeadPass").value;
  if (pw && pw.length < 6) {
    showFieldError('editHeadPass', 'Password must be at least 6 characters.');
    ok = false;
  }
  
  if (!ok) return;

  const id = document.getElementById("editHeadId").value;
  const payload = {
    name: document.getElementById("editHeadName").value,
    email: document.getElementById("editHeadEmail").value,
    phone: document.getElementById("editHeadPhone").value
  };
  if (pw) {
    payload.password = pw;
  }

  try {
    await apiFetch(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    closeModals(); 
    e.target.reset(); 
    loadDepartments(); 
    loadUsers(); 
    showCustomAlert("Success", "Department Head updated!");
  } catch (err) {
    showCustomAlert("Error", err.message || "Failed.");
  }
}

// ── DEPARTMENT HEAD ATTENDANCE ANALYTICS ────────────────────
let allHeadAttendanceRecords = [];
let allDeptHeadsList = [];
let allDepartmentsList = [];

async function loadHeadAttendanceAnalytics() {
  const tbody = document.getElementById('adminHeadAttendanceTableBody');
  if (!tbody) return;

  try {
    const [heads, depts, attendances] = await Promise.all([
      apiFetch('/users?role=dept_head'),
      apiFetch('/departments'),
      apiFetch('/attendance?role=dept_head')
    ]);

    allDeptHeadsList = heads || [];
    allDepartmentsList = depts || [];
    allHeadAttendanceRecords = attendances || [];

    // Populate department filter
    const deptFilter = document.getElementById('adminHeadDeptFilter');
    if (deptFilter && deptFilter.options.length <= 1) {
      deptFilter.innerHTML = '<option value="">All Departments</option>';
      allDepartmentsList.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id || d._id;
        opt.textContent = d.name;
        deptFilter.appendChild(opt);
      });
    }

    // Default to today if date input is empty
    const dateInput = document.getElementById('adminHeadDateFilter');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    filterHeadAttendance();
  } catch (err) {
    console.error('loadHeadAttendanceAnalytics error:', err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger);padding:32px;">Failed to load Department Head attendance analytics.</td></tr>`;
  }
}

function filterHeadAttendance() {
  const tbody = document.getElementById('adminHeadAttendanceTableBody');
  if (!tbody) return;

  const deptFilter = document.getElementById('adminHeadDeptFilter')?.value || '';
  const dateFilter = document.getElementById('adminHeadDateFilter')?.value || '';
  const statusFilter = document.getElementById('adminHeadStatusFilter')?.value || '';
  const searchFilter = (document.getElementById('adminHeadSearchInput')?.value || '').toLowerCase().trim();

  const todayStr = new Date().toISOString().split('T')[0];
  const targetDate = dateFilter || todayStr;

  // Compute KPI metrics for the target date
  const headsInDept = deptFilter
    ? allDeptHeadsList.filter(h => String(h.department_id) === String(deptFilter))
    : allDeptHeadsList;

  const recordsOnTargetDate = allHeadAttendanceRecords.filter(r => r.date === targetDate);
  const presentHeadIds = new Set(recordsOnTargetDate.map(r => {
    return r.employee_id && typeof r.employee_id === 'object'
      ? String(r.employee_id._id || r.employee_id.id)
      : String(r.employee_id);
  }));

  const presentCount = headsInDept.filter(h => presentHeadIds.has(String(h.id || h._id))).length;
  const onTimeCount = recordsOnTargetDate.filter(r => {
    const hId = r.employee_id && typeof r.employee_id === 'object'
      ? String(r.employee_id._id || r.employee_id.id)
      : String(r.employee_id);
    const isInDept = headsInDept.some(h => String(h.id || h._id) === hId);
    return isInDept && r.status === 'Present';
  }).length;

  const lateCount = recordsOnTargetDate.filter(r => {
    const hId = r.employee_id && typeof r.employee_id === 'object'
      ? String(r.employee_id._id || r.employee_id.id)
      : String(r.employee_id);
    const isInDept = headsInDept.some(h => String(h.id || h._id) === hId);
    return isInDept && (r.status === 'Late_1' || r.status === 'Late_2' || r.status === 'Late' || r.status === 'Early Departure');
  }).length;

  const absentCount = Math.max(0, headsInDept.length - presentCount);

  // Update KPI Stat cards
  const totalHeadsEl = document.getElementById('adminHeadTotalHeads');
  const presentTodayEl = document.getElementById('adminHeadPresentToday');
  const onTimeRateEl = document.getElementById('adminHeadOnTimeRate');
  const lateCountEl = document.getElementById('adminHeadLateCount');

  if (totalHeadsEl) totalHeadsEl.textContent = headsInDept.length;
  if (presentTodayEl) presentTodayEl.textContent = `${presentCount} / ${headsInDept.length}`;
  if (onTimeRateEl) {
    const rate = presentCount > 0 ? Math.round((onTimeCount / presentCount) * 100) : 0;
    onTimeRateEl.textContent = `${rate}%`;
  }
  if (lateCountEl) lateCountEl.textContent = `${lateCount} Late · ${absentCount} Absent`;

  // Build rows: if a specific date is filtered, include all Department Heads (showing Absent if no record)
  let rows = [];

  if (dateFilter) {
    headsInDept.forEach(head => {
      const headId = String(head.id || head._id);
      const rec = recordsOnTargetDate.find(r => {
        const empId = r.employee_id && typeof r.employee_id === 'object'
          ? String(r.employee_id._id || r.employee_id.id)
          : String(r.employee_id);
        return empId === headId;
      });

      const dept = allDepartmentsList.find(d => String(d.id || d._id) === String(head.department_id));
      const deptName = dept ? dept.name : '—';

      if (rec) {
        rows.push({
          headName: head.name,
          headEmail: head.email,
          deptName,
          date: rec.date,
          clock_in: rec.clock_in || '—',
          clock_out: rec.clock_out || '—',
          working_hours: rec.working_hours ? `${rec.working_hours.toFixed(1)} hrs` : (rec.clock_out ? '0.0 hrs' : 'In Progress'),
          status: rec.status || 'Present',
          lat: rec.clock_in_lat,
          lng: rec.clock_in_lng,
          isAbsent: false,
        });
      } else {
        rows.push({
          headName: head.name,
          headEmail: head.email,
          deptName,
          date: dateFilter,
          clock_in: '—',
          clock_out: '—',
          working_hours: '—',
          status: 'Absent',
          lat: null,
          lng: null,
          isAbsent: true,
        });
      }
    });
  } else {
    // Show all records across all dates
    allHeadAttendanceRecords.forEach(rec => {
      const empId = rec.employee_id && typeof rec.employee_id === 'object'
        ? String(rec.employee_id._id || rec.employee_id.id)
        : String(rec.employee_id);
      const head = allDeptHeadsList.find(h => String(h.id || h._id) === empId);
      const headName = head ? head.name : (rec.employee_id?.name || 'Dept Head');
      const headEmail = head ? head.email : (rec.employee_id?.email || '');

      let deptName = '—';
      if (rec.department_id && typeof rec.department_id === 'object') {
        deptName = rec.department_id.name;
      } else {
        const d = allDepartmentsList.find(dep => String(dep.id || dep._id) === String(rec.department_id || head?.department_id));
        if (d) deptName = d.name;
      }

      rows.push({
        headName,
        headEmail,
        deptName,
        date: rec.date,
        clock_in: rec.clock_in || '—',
        clock_out: rec.clock_out || '—',
        working_hours: rec.working_hours ? `${rec.working_hours.toFixed(1)} hrs` : (rec.clock_out ? '0.0 hrs' : 'In Progress'),
        status: rec.status || 'Present',
        lat: rec.clock_in_lat,
        lng: rec.clock_in_lng,
        isAbsent: false,
      });
    });
  }

  // Filter rows by Status & Search
  if (statusFilter) {
    if (statusFilter === 'Present') {
      rows = rows.filter(r => r.status === 'Present');
    } else if (statusFilter === 'Late') {
      rows = rows.filter(r => r.status === 'Late_1' || r.status === 'Late_2' || r.status === 'Late');
    } else if (statusFilter === 'Early Departure') {
      rows = rows.filter(r => r.status === 'Early Departure');
    } else if (statusFilter === 'Absent') {
      rows = rows.filter(r => r.isAbsent || r.status === 'Absent');
    }
  }

  if (searchFilter) {
    rows = rows.filter(r =>
      r.headName.toLowerCase().includes(searchFilter) ||
      r.headEmail.toLowerCase().includes(searchFilter) ||
      r.deptName.toLowerCase().includes(searchFilter)
    );
  }

  // Sort rows: Absent and Late arrivals at the top if today, else sort by date desc
  rows.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.headName.localeCompare(b.headName);
  });

  tbody.innerHTML = '';
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">No attendance records found matching filters.</td></tr>`;
    return;
  }

  rows.forEach(r => {
    let badgeClass = 'status-closed';
    let displayStatus = 'On Time';

    if (r.isAbsent || r.status === 'Absent') {
      badgeClass = 'status-reopened';
      displayStatus = 'Absent';
    } else if (r.status === 'Late_1') {
      badgeClass = 'status-pending';
      displayStatus = 'Slightly Late';
    } else if (r.status === 'Late_2' || r.status === 'Late') {
      badgeClass = 'status-reopened';
      displayStatus = 'Late Arrival';
    } else if (r.status === 'Early Departure') {
      badgeClass = 'status-pending';
      displayStatus = 'Early Departure';
    } else if (r.status === 'Present') {
      badgeClass = 'status-closed';
      displayStatus = 'Present';
    }

    const geoAudit = (r.lat && r.lng)
      ? `<span style="font-size:0.78rem;color:var(--success);display:flex;align-items:center;gap:4px;" title="Geofence verified at ${r.lat}, ${r.lng}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Campus Ground
         </span>`
      : `<span style="font-size:0.78rem;color:var(--text-muted);">—</span>`;

    tbody.innerHTML += `
      <tr>
        <td>
          <div style="font-weight:600;color:var(--text-primary);">${r.headName}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${r.headEmail}</div>
        </td>
        <td><span style="font-weight:500;color:var(--text-primary);">${r.deptName}</span></td>
        <td>${r.date}</td>
        <td style="font-weight:600;color:var(--text-primary);">${r.clock_in}</td>
        <td style="font-weight:600;color:var(--text-primary);">${r.clock_out}</td>
        <td>${r.working_hours}</td>
        <td><span class="status-badge ${badgeClass}">${displayStatus}</span></td>
        <td>${geoAudit}</td>
      </tr>`;
  });
}

function resetHeadAttendanceFilters() {
  const dept = document.getElementById('adminHeadDeptFilter');
  const date = document.getElementById('adminHeadDateFilter');
  const status = document.getElementById('adminHeadStatusFilter');
  const search = document.getElementById('adminHeadSearchInput');

  if (dept) dept.value = '';
  if (date) date.value = new Date().toISOString().split('T')[0];
  if (status) status.value = '';
  if (search) search.value = '';

  filterHeadAttendance();
}

function exportHeadAttendanceReport() {
  const dateVal = document.getElementById('adminHeadDateFilter')?.value || 'All Dates';
  const tableHtml = document.getElementById('adminHeadAttendanceTableBody')?.innerHTML || '';

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>CampusFix — Department Head Attendance Analytics</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e1b4b; }
          h2 { margin: 0 0 4px; color: #312e81; }
          .subtitle { font-size: 0.85rem; color: #64748b; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.85rem; }
          th { text-align: left; padding: 8px 12px; background: #e0e7ff; color: #3730a3; border-bottom: 2px solid #c7d2fe; }
          td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
          .status-badge { padding: 3px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
          .status-closed { background: #dcfce7; color: #15803d; }
          .status-pending { background: #fef9c3; color: #a16207; }
          .status-reopened { background: #fee2e2; color: #b91c1c; }
        </style>
      </head>
      <body>
        <h2>CampusFix — Department Head Attendance Audit</h2>
        <div class="subtitle">Report Date: ${dateVal} &nbsp;|&nbsp; Chitkara University Campus Administration</div>
        <table>
          <thead>
            <tr>
              <th>Department Head</th>
              <th>Department</th>
              <th>Date</th>
              <th>Punch In</th>
              <th>Punch Out</th>
              <th>Working Hours</th>
              <th>Punctuality / Status</th>
              <th>Geofence Audit</th>
            </tr>
          </thead>
          <tbody>
            ${tableHtml}
          </tbody>
        </table>
        <div style="margin-top:24px; font-size:0.75rem; color:#94a3b8; text-align:center;">
          Generated automatically by CampusFix Super Admin Portal &nbsp;|&nbsp; Powered by MongoDB Atlas
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}
