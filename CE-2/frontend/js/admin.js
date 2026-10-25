

document.addEventListener("DOMContentLoaded", () => {
  if (currentUser.role !== "admin") { window.location.href = "login.html"; return; }
  loadStats(); loadAllComplaints(); loadDepartments(); loadLocations(); loadUsers(); loadHeadAttendanceAnalytics(); loadHeadLeavesAdmin(); loadHeadPayslipsAdmin();

  // Initialize AI Safety, Risk, and Audit Scans
  loadComplaintTriageAdmin();
  loadInfrastructureRisksAdmin();
  loadAttendanceAnomaliesAdmin();
  loadPayrollAnomaliesAdmin();

  // Background polling for new Department Head leave requests
  checkPendingLeavesBadge(true);
  setInterval(() => {
    checkPendingLeavesBadge(false);
  }, 10000);
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

let activeTriageAuditMap = {};
let filterOnlyHazardsMode = false;

async function loadAllComplaints() {
  try {
    const filtDept   = document.getElementById("filtDept")?.value || '';
    const filtStatus = document.getElementById("filtStatus")?.value || '';

    let complaints = await apiFetch('/complaints');
    complaints = (complaints || []).filter(c => c.source !== 'upvoted');

    if (filtStatus) {
      complaints = complaints.filter(c => c.status === filtStatus);
    }
    if (filtDept) {
      const depts = await apiFetch('/departments');
      const dept  = (depts || []).find(d => d.id == filtDept);
      if (dept) {
        complaints = complaints.filter(c =>
          c.category && c.category.toLowerCase() === dept.category_tag.toLowerCase()
        );
      }
    }

    if (filterOnlyHazardsMode) {
      complaints = complaints.filter(c => {
        const tr = activeTriageAuditMap[String(c.id || c._id)];
        return tr && tr.isSafetyHazard;
      });
    }

    complaints.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));

    const tbody = document.getElementById("globalComplaintsBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!complaints.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No complaints found.</td></tr>';
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
             </svg>${c.upvote_count}</span>`
        : '';

      const tr = activeTriageAuditMap[String(c.id || c._id)];
      let triageHtml = `<span style="font-size:0.8rem;color:var(--text-secondary);font-weight:600;">${c.urgency || 'Medium'}</span>`;

      if (tr && tr.isSafetyHazard) {
        triageHtml = `
          <div>
            <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;background:rgba(239,68,68,0.18);color:var(--danger);font-weight:700;font-size:0.75rem;">
              ⚡ ${tr.hazardType || 'Safety Hazard'}
            </span>
            ${tr.requiresEscalation ? `
              <div style="margin-top:4px;">
                <button class="action-btn danger" style="padding:2px 6px;font-size:0.72rem;font-weight:700;cursor:pointer;" onclick="escalateComplaintUrgency('${c.id}','${tr.hazardType}')">
                  ⚡ Escalate to High
                </button>
              </div>` : ''}
          </div>`;
      }

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
          <td>${triageHtml}</td>
          <td style="color:var(--text-secondary);">${formatDate(c.created_at || c.createdAt)}</td>
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

// ── DEPARTMENT HEAD LEAVE MANAGEMENT (Admin) ──────────────
let allHeadLeavesList = [];
let lastAdminPendingLeavesCount = null;

function updateHeadLeavesBadge(count) {
  const badge = document.getElementById('adminHeadLeavesNavBadge');
  if (!badge) return;
  const num = Number(count) || 0;
  if (num > 0) {
    badge.textContent = num > 99 ? '99+' : num;
    badge.style.display = 'inline-flex';
    badge.title = `${num} Department Head leave request${num > 1 ? 's' : ''} awaiting review`;
  } else {
    badge.style.display = 'none';
  }
}

async function checkPendingLeavesBadge(silent = false) {
  try {
    const leaves = await apiFetch('/leaves?role=dept_head');
    const pendingList = (leaves || []).filter(l => l.status === 'Pending');
    const count = pendingList.length;

    updateHeadLeavesBadge(count);

    if (lastAdminPendingLeavesCount !== null && count > lastAdminPendingLeavesCount) {
      if (typeof showToastNotification === 'function') {
        const latest = pendingList[0];
        const applicantName = latest?.employee_name || latest?.employee_id?.name || 'A Department Head';
        showToastNotification(`🔔 <strong>${applicantName}</strong> submitted a leave request pending approval.`, 'warning');
      }
      // If currently viewing the Head Leaves tab, refresh the table so it appears live
      const activeTab = document.querySelector('.nav-item.active');
      if (activeTab && activeTab.dataset.tab === 'head-leaves') {
        loadHeadLeavesAdmin();
      }
    }
    lastAdminPendingLeavesCount = count;
  } catch (err) {
    // Suppress background poll errors
  }
}

async function loadHeadLeavesAdmin() {
  const tbody = document.getElementById('adminHeadLeavesBody');
  if (!tbody) return;

  try {
    const [heads, depts, leaves] = await Promise.all([
      apiFetch('/users?role=dept_head'),
      apiFetch('/departments'),
      apiFetch('/leaves?role=dept_head')
    ]);

    allDeptHeadsList = heads || [];
    allDepartmentsList = depts || [];
    allHeadLeavesList = leaves || [];

    // Populate department filter
    const deptFilter = document.getElementById('adminLeaveDeptFilter');
    if (deptFilter && deptFilter.options.length <= 1) {
      deptFilter.innerHTML = '<option value="">All Departments</option>';
      allDepartmentsList.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id || d._id;
        opt.textContent = d.name;
        deptFilter.appendChild(opt);
      });
    }

    // Update KPIs
    const total = allHeadLeavesList.length;
    const pending = allHeadLeavesList.filter(l => l.status === 'Pending').length;
    const approved = allHeadLeavesList.filter(l => l.status === 'Approved').length;
    const rejected = allHeadLeavesList.filter(l => l.status === 'Rejected').length;

    const tEl = document.getElementById('adminLeaveTotal');
    const pEl = document.getElementById('adminLeavePending');
    const aEl = document.getElementById('adminLeaveApproved');
    const rEl = document.getElementById('adminLeaveRejected');

    if (tEl) tEl.textContent = total;
    if (pEl) pEl.textContent = pending;
    if (aEl) aEl.textContent = approved;
    if (rEl) rEl.textContent = rejected;

    updateHeadLeavesBadge(pending);
    lastAdminPendingLeavesCount = pending;

    filterHeadLeavesAdmin();
  } catch (err) {
    console.error('loadHeadLeavesAdmin error:', err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger);padding:32px;">Failed to load Department Head leave requests.</td></tr>`;
  }
}

function filterHeadLeavesAdmin() {
  const tbody = document.getElementById('adminHeadLeavesBody');
  if (!tbody) return;

  const deptFilter = document.getElementById('adminLeaveDeptFilter')?.value || '';
  const statusFilter = document.getElementById('adminLeaveStatusFilter')?.value || '';
  const searchFilter = (document.getElementById('adminLeaveSearchInput')?.value || '').toLowerCase().trim();

  let filtered = [...allHeadLeavesList];

  if (deptFilter) {
    filtered = filtered.filter(l => {
      const dId = l.department_id && typeof l.department_id === 'object'
        ? String(l.department_id._id || l.department_id.id)
        : String(l.department_id);
      return dId === String(deptFilter);
    });
  }

  if (statusFilter) {
    filtered = filtered.filter(l => l.status === statusFilter);
  }

  if (searchFilter) {
    filtered = filtered.filter(l => {
      const empName = (l.employee_name || l.employee_id?.name || '').toLowerCase();
      const empEmail = (l.employee_id?.email || '').toLowerCase();
      const reason = (l.reason || '').toLowerCase();
      const type = (l.leave_type || '').toLowerCase();
      return empName.includes(searchFilter) || empEmail.includes(searchFilter) || reason.includes(searchFilter) || type.includes(searchFilter);
    });
  }

  // Sort: Pending first, then by date descending
  filtered.sort((a, b) => {
    if (a.status === 'Pending' && b.status !== 'Pending') return -1;
    if (a.status !== 'Pending' && b.status === 'Pending') return 1;
    return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0);
  });

  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">No Department Head leave requests found.</td></tr>`;
    return;
  }

  filtered.forEach(l => {
    const headName = l.employee_name || l.employee_id?.name || 'Dept Head';
    const headEmail = l.employee_id?.email || '';

    let deptName = '—';
    if (l.department_id && typeof l.department_id === 'object') {
      deptName = l.department_id.name;
    } else {
      const d = allDepartmentsList.find(dep => String(dep.id || dep._id) === String(l.department_id));
      if (d) deptName = d.name;
    }

    // Calculate days
    let durationText = `${l.from_date} → ${l.to_date}`;
    if (l.from_date && l.to_date) {
      const from = new Date(l.from_date);
      const to = new Date(l.to_date);
      const days = Math.round(Math.abs((to - from) / (24 * 60 * 60 * 1000))) + 1;
      durationText += ` <span style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">(${days} day${days > 1 ? 's' : ''})</span>`;
    }

    const statusClass = l.status === 'Approved' ? 'status-closed' : l.status === 'Rejected' ? 'status-reopened' : 'status-pending';

    let reviewInfo = '—';
    if (l.reviewed_by) {
      const rDate = l.reviewed_at ? new Date(l.reviewed_at).toLocaleDateString() : '';
      reviewInfo = `<div><strong style="color:var(--text-primary);">${l.reviewed_by}</strong></div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">${rDate}</div>`;
    } else if (l.status === 'Pending') {
      reviewInfo = `<span style="font-size:0.78rem;color:var(--warning);font-weight:500;">Action Required</span>`;
    }

    let actionsHtml = '—';
    if (l.status === 'Pending') {
      actionsHtml = `
        <div style="display:flex; gap:6px;">
          <button class="action-btn" style="color:var(--success);border-color:rgba(16,185,129,0.3);font-weight:600;" onclick="reviewHeadLeaveAdmin('${l.id}','Approved')">
            Approve
          </button>
          <button class="action-btn danger" style="font-weight:600;" onclick="reviewHeadLeaveAdmin('${l.id}','Rejected')">
            Reject
          </button>
        </div>`;
    } else {
      actionsHtml = `<span style="font-size:0.78rem;color:var(--text-muted);">${l.status}</span>`;
    }

    let staffingRiskHtml = `<span style="font-size:0.75rem;color:var(--text-muted);">—</span>`;
    if (l.status === 'Pending') {
      staffingRiskHtml = `
        <button class="ai-pill-btn" onclick="openLeaveAdvisorModal('${l.id}')" style="font-size:0.72rem; padding:3px 8px; border-color:rgba(99,102,241,0.4); color:var(--accent); cursor:pointer;">
          ✨ Check Risk
        </button>`;
    }

    tbody.innerHTML += `
      <tr>
        <td>
          <div style="font-weight:600;color:var(--text-primary);">${headName}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${headEmail}</div>
        </td>
        <td><span style="font-weight:500;color:var(--text-primary);">${deptName}</span></td>
        <td><span style="font-weight:600;color:var(--accent);">${l.leave_type}</span></td>
        <td style="white-space:nowrap;">${durationText}</td>
        <td style="max-width:200px;color:var(--text-secondary);font-size:0.82rem;">${l.reason}</td>
        <td><span class="status-badge ${statusClass}">${l.status}</span></td>
        <td>${staffingRiskHtml}</td>
        <td>${reviewInfo}</td>
        <td>${actionsHtml}</td>
      </tr>`;
  });
}

async function reviewHeadLeaveAdmin(leaveId, decision) {
  const action = decision === 'Approved' ? 'approve' : 'reject';
  showCustomConfirm(
    `${decision === 'Approved' ? 'Approve' : 'Reject'} Department Head Leave`,
    `Are you sure you want to ${action} this leave request? The Department Head will see this decision immediately.`,
    async () => {
      try {
        await apiFetch(`/leaves/${leaveId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: decision,
            reviewed_by: currentUser.name || 'Campus Administrator',
            reviewed_at: new Date().toISOString()
          })
        });

        loadHeadLeavesAdmin();
        showCustomAlert('Leave Updated', `Department Head leave request has been ${decision.toLowerCase()}.`);
      } catch (err) {
        showCustomAlert('Error', err.message || 'Failed to update leave request.');
      }
    }
  );
}

function resetHeadLeavesFilters() {
  const dept = document.getElementById('adminLeaveDeptFilter');
  const status = document.getElementById('adminLeaveStatusFilter');
  const search = document.getElementById('adminLeaveSearchInput');

  if (dept) dept.value = '';
  if (status) status.value = '';
  if (search) search.value = '';

  filterHeadLeavesAdmin();
}

// ── DEPARTMENT HEAD PAYSLIPS (Admin Control) ──────────────
const MONTHS_ADM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
let allHeadPayslipsList = [];

async function loadHeadPayslipsAdmin() {
  const tbody = document.getElementById('adminHeadPayslipsTableBody');
  if (!tbody) return;

  try {
    const [heads, depts, slips] = await Promise.all([
      apiFetch('/users?role=dept_head'),
      apiFetch('/departments'),
      apiFetch('/payslips?role=dept_head')
    ]);

    allDeptHeadsList = heads || [];
    allDepartmentsList = depts || [];
    allHeadPayslipsList = slips || [];

    // Populate department filter
    const deptFilter = document.getElementById('adminHeadPsDeptFilter');
    if (deptFilter && deptFilter.options.length <= 1) {
      deptFilter.innerHTML = '<option value="">All Departments</option>';
      allDepartmentsList.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id || d._id;
        opt.textContent = d.name;
        deptFilter.appendChild(opt);
      });
    }

    // Calculate KPIs
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    const totalCount = allHeadPayslipsList.length;
    const totalDisbursed = allHeadPayslipsList.reduce((acc, s) => acc + (Number(s.net_salary) || 0), 0);
    const thisMonthCount = allHeadPayslipsList.filter(s => s.month === curMonth && s.year === curYear).length;
    const avgSalary = totalCount > 0 ? Math.round(totalDisbursed / totalCount) : 0;

    const tEl = document.getElementById('adminHeadTotalPayslips');
    const dEl = document.getElementById('adminHeadTotalDisbursed');
    const mEl = document.getElementById('adminHeadMonthGenerated');
    const aEl = document.getElementById('adminHeadAvgSalary');

    if (tEl) tEl.textContent = totalCount;
    if (dEl) dEl.textContent = `₹${totalDisbursed.toLocaleString()}`;
    if (mEl) mEl.textContent = `${thisMonthCount} Issued`;
    if (aEl) aEl.textContent = `₹${avgSalary.toLocaleString()}`;

    filterHeadPayslipsAdmin();
  } catch (err) {
    console.error('loadHeadPayslipsAdmin error:', err);
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--danger);padding:32px;">Failed to load Department Head payslips.</td></tr>`;
  }
}

function filterHeadPayslipsAdmin() {
  const tbody = document.getElementById('adminHeadPayslipsTableBody');
  if (!tbody) return;

  const deptFilter = document.getElementById('adminHeadPsDeptFilter')?.value || '';
  const monthFilter = document.getElementById('adminHeadPsMonthFilter')?.value || '';
  const yearFilter = document.getElementById('adminHeadPsYearFilter')?.value || '';
  const searchFilter = (document.getElementById('adminHeadPsSearchInput')?.value || '').toLowerCase().trim();

  let filtered = [...allHeadPayslipsList];

  if (deptFilter) {
    filtered = filtered.filter(s => {
      const dId = s.department_id && typeof s.department_id === 'object'
        ? String(s.department_id._id || s.department_id.id)
        : String(s.department_id || '');
      return dId === String(deptFilter);
    });
  }

  if (monthFilter) {
    filtered = filtered.filter(s => String(s.month) === String(monthFilter));
  }

  if (yearFilter) {
    filtered = filtered.filter(s => String(s.year) === String(yearFilter));
  }

  if (searchFilter) {
    filtered = filtered.filter(s => {
      const name = (s.employee_name || s.employee_id?.name || '').toLowerCase();
      const email = (s.employee_id?.email || '').toLowerCase();
      return name.includes(searchFilter) || email.includes(searchFilter);
    });
  }

  // Sort newest first
  filtered.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.month - a.month;
  });

  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:32px;">No Department Head payslips found matching filters.</td></tr>`;
    return;
  }

  filtered.forEach(s => {
    const headName = s.employee_name || s.employee_id?.name || 'Dept Head';
    const headEmail = s.employee_id?.email || '';

    let deptName = '—';
    if (s.department_id && typeof s.department_id === 'object') {
      deptName = s.department_id.name;
    } else {
      const d = allDepartmentsList.find(dep => String(dep.id || dep._id) === String(s.department_id));
      if (d) deptName = d.name;
    }

    const period = `${MONTHS_ADM[s.month - 1] || s.month} ${s.year}`;

    tbody.innerHTML += `
      <tr>
        <td>
          <div style="font-weight:600;color:var(--text-primary);">${headName}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${headEmail}</div>
        </td>
        <td><span style="font-weight:500;color:var(--text-primary);">${deptName}</span></td>
        <td><span style="font-weight:600;color:var(--accent);">${period}</span></td>
        <td>₹${Number(s.basic_salary).toLocaleString()}</td>
        <td style="color:var(--success);">+₹${Number(s.allowances || 0).toLocaleString()}</td>
        <td style="color:var(--danger);">-₹${Number(s.deductions || 0).toLocaleString()}</td>
        <td style="font-weight:700;color:var(--accent);font-size:0.95rem;">₹${Number(s.net_salary).toLocaleString()}</td>
        <td><span style="font-size:0.8rem;color:var(--text-muted);">${s.generated_by || 'Super Admin'}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="action-btn" onclick='printHeadPayslip(${JSON.stringify(s).replace(/'/g,"&apos;")})'>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
              Print
            </button>
            <button class="action-btn danger" onclick="deleteHeadPayslipAdmin('${s.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  });
}

async function openAdminHeadPayslipModal() {
  const modal = document.getElementById('adminHeadPayslipModal');
  const sel = document.getElementById('adminHeadPsSelect');
  if (!modal || !sel) return;

  if (!allDeptHeadsList || allDeptHeadsList.length === 0) {
    try {
      allDeptHeadsList = await apiFetch('/users?role=dept_head');
    } catch (err) {
      console.warn('Failed to fetch heads on modal open:', err);
    }
  }

  sel.innerHTML = '<option value="" disabled selected>Select a Department Head</option>';
  (allDeptHeadsList || []).forEach(h => {
    const opt = document.createElement('option');
    opt.value = h.id || h._id;
    opt.textContent = `${h.name} (${h.email})`;
    opt.dataset.name = h.name;
    const dId = h.department_id && typeof h.department_id === 'object'
      ? (h.department_id._id || h.department_id.id || '')
      : (h.department_id || '');
    opt.dataset.dept = dId;
    sel.appendChild(opt);
  });

  const now = new Date();
  const mSel = document.getElementById('adminHeadPsMonth');
  const yInput = document.getElementById('adminHeadPsYear');
  if (mSel) mSel.value = now.getMonth() + 1;
  if (yInput) yInput.value = now.getFullYear();

  const basicInput = document.getElementById('adminHeadPsBasic');
  const allowInput = document.getElementById('adminHeadPsAllow');
  const deductInput = document.getElementById('adminHeadPsDeduct');
  if (basicInput) basicInput.value = '';
  if (allowInput) allowInput.value = '0';
  if (deductInput) deductInput.value = '0';
  calcAdminNetPreview();

  modal.classList.remove('hidden');
}

function closeAdminHeadPayslipModal() {
  const modal = document.getElementById('adminHeadPayslipModal');
  if (modal) modal.classList.add('hidden');
  document.getElementById('adminHeadPayslipForm')?.reset();
}

function calcAdminNetPreview() {
  const basic = Number(document.getElementById('adminHeadPsBasic')?.value || 0);
  const allow = Number(document.getElementById('adminHeadPsAllow')?.value || 0);
  const deduct = Number(document.getElementById('adminHeadPsDeduct')?.value || 0);
  const net = Math.max(0, basic + allow - deduct);
  const preview = document.getElementById('adminHeadPsNetPreview');
  if (preview) preview.textContent = `₹${net.toLocaleString()}`;
}

async function submitAdminHeadPayslip(e) {
  e.preventDefault();
  const sel = document.getElementById('adminHeadPsSelect');
  const headId = sel?.value;
  if (!headId) {
    showCustomAlert('Missing Selection', 'Please select a Department Head.');
    return;
  }

  const selectedOpt = sel.options[sel.selectedIndex];
  const headName = selectedOpt?.dataset.name || 'Dept Head';
  
  // Safe extraction of clean department_id
  const head = (allDeptHeadsList || []).find(h => String(h.id || h._id) === String(headId));
  let deptId = null;
  if (head && head.department_id) {
    deptId = typeof head.department_id === 'object'
      ? (head.department_id._id || head.department_id.id)
      : head.department_id;
  }
  if (!deptId || deptId === '[object Object]') {
    const rawDept = selectedOpt?.dataset.dept;
    if (rawDept && rawDept !== '[object Object]') deptId = rawDept;
  }

  const month = parseInt(document.getElementById('adminHeadPsMonth')?.value || 1);
  const year = parseInt(document.getElementById('adminHeadPsYear')?.value || 2026);
  const basic = parseFloat(document.getElementById('adminHeadPsBasic')?.value || 0);
  const allow = parseFloat(document.getElementById('adminHeadPsAllow')?.value || 0);
  const deduct = parseFloat(document.getElementById('adminHeadPsDeduct')?.value || 0);

  if (!basic || basic <= 0) {
    showCustomAlert('Invalid Salary', 'Basic salary must be greater than zero.');
    return;
  }

  const payload = {
    employee_id: headId,
    employee_name: headName,
    department_id: (deptId && deptId !== '[object Object]') ? String(deptId) : null,
    month,
    year,
    basic_salary: basic,
    allowances: allow,
    deductions: deduct,
    generated_by: currentUser.name || 'Super Admin',
  };

  try {
    await apiFetch('/payslips', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    closeAdminHeadPayslipModal();
    loadHeadPayslipsAdmin();
    showCustomAlert('Payslip Generated', `Official payslip for ${headName} (${MONTHS_ADM[month - 1]} ${year}) has been issued successfully.`);
  } catch (err) {
    showCustomAlert('Error', err.message || 'Failed to generate payslip.');
  }
}

async function deleteHeadPayslipAdmin(slipId) {
  showCustomConfirm(
    'Delete Payslip',
    'Are you sure you want to permanently delete this Department Head payslip?',
    async () => {
      try {
        await apiFetch(`/payslips/${slipId}`, { method: 'DELETE' });
        loadHeadPayslipsAdmin();
        showCustomAlert('Deleted', 'The payslip record has been deleted.');
      } catch (err) {
        showCustomAlert('Error', err.message || 'Failed to delete payslip.');
      }
    }
  );
}

function printHeadPayslip(slip) {
  const period = `${MONTHS_ADM[slip.month - 1] || slip.month} ${slip.year}`;
  const html = `
    <html><head><title>Payslip - ${slip.employee_name}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; }
      .header { border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
      h2 { margin: 0 0 6px; color: #4338ca; }
      .sub { color: #64748b; font-size: 0.88rem; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 0.9rem; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 0.92rem; }
      .net { background: #eef2ff; font-weight: 700; color: #4338ca; font-size: 1.05rem; }
      .footer { margin-top: 36px; font-size: 0.78rem; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 16px; }
    </style></head><body>
    <div class="header">
      <h2>CampusFix — Department Head Remuneration Voucher</h2>
      <div class="sub">Chitkara University Administration &nbsp;|&nbsp; Pay Period: ${period}</div>
    </div>
    <div class="grid">
      <div><strong>Beneficiary:</strong> ${slip.employee_name} (Department Head)</div>
      <div><strong>Disbursed By:</strong> ${slip.generated_by || 'Campus Administration'}</div>
    </div>
    <table>
      <tr><td>Basic Salary</td><td style="text-align:right;">₹${Number(slip.basic_salary).toLocaleString()}</td></tr>
      <tr><td style="color:#16a34a;">Special Allowances & Incentives</td><td style="text-align:right;color:#16a34a;">+ ₹${Number(slip.allowances || 0).toLocaleString()}</td></tr>
      <tr><td style="color:#dc2626;">Statutory Deductions & TDS</td><td style="text-align:right;color:#dc2626;">- ₹${Number(slip.deductions || 0).toLocaleString()}</td></tr>
      <tr class="net"><td>Total Net Salary Credited</td><td style="text-align:right;">₹${Number(slip.net_salary).toLocaleString()}</td></tr>
    </table>
    <div class="footer">
      Computer-generated remuneration payslip issued via CampusFix Super Admin Portal.<br/>
      Secured and synchronized with MongoDB Atlas.
    </div>
    </body></html>`;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}

function resetHeadPayslipsFilters() {
  const dept = document.getElementById('adminHeadPsDeptFilter');
  const month = document.getElementById('adminHeadPsMonthFilter');
  const year = document.getElementById('adminHeadPsYearFilter');
  const search = document.getElementById('adminHeadPsSearchInput');

  if (dept) dept.value = '';
  if (month) month.value = '';
  if (year) year.value = '2026';
  if (search) search.value = '';

  filterHeadPayslipsAdmin();
}

// ─── MODULE 1: AI EXECUTIVE BRIEF & NATURAL LANGUAGE COPILOT ─
async function fetchDailyAiBrief() {
  const btn = document.getElementById('btnGenerateBrief');
  const btnText = document.getElementById('btnGenerateBriefText');
  const initial = document.getElementById('aiBriefInitialState');
  const loading = document.getElementById('aiBriefLoadingState');
  const content = document.getElementById('aiBriefContentState');
  const tsBadge = document.getElementById('aiBriefTimestamp');
  const tsVal = document.getElementById('aiBriefTimeVal');

  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Generating...';
  if (initial) initial.classList.add('hidden');
  if (content) content.classList.add('hidden');
  if (loading) loading.classList.remove('hidden');

  try {
    const res = await apiFetch('/ai/admin/daily-brief', { method: 'POST' });
    if (!res || !res.success) throw new Error(res?.message || 'Failed to generate brief');

    const brief = res.brief || {};
    
    // Headline
    const hlEl = document.getElementById('aiBriefHeadline');
    if (hlEl) hlEl.textContent = brief.headline || 'Operational summary generated.';

    // Alerts
    const alertsList = document.getElementById('aiBriefAlertsList');
    if (alertsList) {
      alertsList.innerHTML = (brief.criticalAlerts || []).map(a => `<li style="margin-bottom:6px; display:flex; align-items:flex-start; gap:6px;"><span style="color:var(--danger);font-weight:bold;">•</span><span>${a}</span></li>`).join('');
      if (!brief.criticalAlerts || brief.criticalAlerts.length === 0) {
        alertsList.innerHTML = '<li style="color:var(--text-muted);">No urgent safety issues detected.</li>';
      }
    }

    // Dept Highlights
    const deptsList = document.getElementById('aiBriefDeptsList');
    if (deptsList) {
      deptsList.innerHTML = (brief.departmentHighlights || []).map(d => `<li style="margin-bottom:6px; display:flex; align-items:flex-start; gap:6px;"><span style="color:var(--accent);font-weight:bold;">•</span><span>${d}</span></li>`).join('');
    }

    // Staffing
    const staffingEl = document.getElementById('aiBriefStaffingText');
    if (staffingEl) staffingEl.textContent = brief.staffingSummary || 'Workforce attendance stable.';

    // Actions
    const actionsList = document.getElementById('aiBriefActionsList');
    if (actionsList) {
      actionsList.innerHTML = (brief.recommendedActions || []).map(act => `<li style="margin-bottom:4px;">${act}</li>`).join('');
    }

    if (tsVal) tsVal.textContent = res.generatedAt || new Date().toLocaleTimeString();
    if (tsBadge) tsBadge.style.display = 'inline-flex';

    if (loading) loading.classList.add('hidden');
    if (content) content.classList.remove('hidden');
    if (btnText) btnText.textContent = 'Refresh AI Brief';
  } catch (err) {
    console.error('fetchDailyAiBrief error:', err);
    if (loading) loading.classList.add('hidden');
    if (initial) initial.classList.remove('hidden');
    if (btnText) btnText.textContent = 'Generate Daily AI Brief';
    showCustomAlert('AI Brief Error', err.message || 'Unable to generate daily brief at this time.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

let _lastCopilotToggleTime = 0;
function toggleAiCopilot(forceOpen = null, e = null) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  const now = Date.now();
  if (forceOpen === null && now - _lastCopilotToggleTime < 200) {
    return;
  }
  _lastCopilotToggleTime = now;

  const drawer = document.getElementById('aiCopilotDrawer');
  const overlay = document.getElementById('aiCopilotOverlay');
  if (!drawer || !overlay) {
    console.error('AI Copilot drawer elements not found');
    return;
  }

  const isCurrentlyOpen = drawer.classList.contains('open') || drawer.style.right === '0px';
  const shouldOpen = forceOpen !== null ? forceOpen : !isCurrentlyOpen;

  if (shouldOpen) {
    drawer.classList.add('open');
    drawer.style.setProperty('right', '0px', 'important');
    drawer.style.setProperty('display', 'flex', 'important');
    overlay.classList.add('active');
    overlay.classList.remove('hidden');
    overlay.style.setProperty('display', 'block', 'important');
    overlay.style.setProperty('opacity', '1', 'important');
    overlay.style.setProperty('visibility', 'visible', 'important');
    overlay.style.setProperty('pointer-events', 'auto', 'important');
    const input = document.getElementById('aiCopilotInput');
    if (input) setTimeout(() => input.focus(), 150);
  } else {
    drawer.classList.remove('open');
    drawer.style.setProperty('right', '-520px', 'important');
    overlay.classList.remove('active');
    overlay.classList.add('hidden');
    overlay.style.setProperty('display', 'none', 'important');
    overlay.style.setProperty('opacity', '0', 'important');
    overlay.style.setProperty('visibility', 'hidden', 'important');
    overlay.style.setProperty('pointer-events', 'none', 'important');
  }
}
window.toggleAiCopilot = toggleAiCopilot;

function askCopilotPredefined(text) {
  const input = document.getElementById('aiCopilotInput');
  if (input) {
    input.value = text;
    submitAiCopilotQuery();
  }
}
window.askCopilotPredefined = askCopilotPredefined;

function formatInlineMarkdown(str) {
  if (!str) return '';
  return str
    .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(?<![*\w])\*([^*]+)\*(?![*\w])/g, '<em>$1</em>')
    .replace(/(?<![_\w])_([^_]+)_(?![_\w])/g, '<em>$1</em>');
}

function formatAiResponse(rawText) {
  if (!rawText) return '';

  // 1. Sanitize HTML entities to prevent XSS vulnerabilities
  let text = String(rawText)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Normalize line breaks
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // 2. Process blocks separated by double line breaks
  const rawBlocks = text.split(/\n{2,}/);
  const formattedBlocks = [];

  for (const block of rawBlocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;
    const lines = trimmedBlock.split('\n');

    let inList = false;
    let listType = null;
    let pBuffer = [];
    let blockHtml = '';

    const flushPBuffer = () => {
      if (pBuffer.length > 0) {
        blockHtml += '<p>' + pBuffer.map(formatInlineMarkdown).join('<br>') + '</p>';
        pBuffer = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const isUl = /^[-*•]\s+/.test(line);
      const isOl = /^\d+\.\s+/.test(line);

      if (isUl) {
        flushPBuffer();
        if (!inList || listType !== 'ul') {
          if (inList) blockHtml += listType === 'ul' ? '</ul>' : '</ol>';
          blockHtml += '<ul>';
          inList = true;
          listType = 'ul';
        }
        blockHtml += '<li>' + formatInlineMarkdown(line.replace(/^[-*•]\s+/, '')) + '</li>';
      } else if (isOl) {
        flushPBuffer();
        if (!inList || listType !== 'ol') {
          if (inList) blockHtml += listType === 'ul' ? '</ul>' : '</ol>';
          blockHtml += '<ol>';
          inList = true;
          listType = 'ol';
        }
        blockHtml += '<li>' + formatInlineMarkdown(line.replace(/^\d+\.\s+/, '')) + '</li>';
      } else if (/^#{1,4}\s+/.test(line) && lines.length === 1) {
        flushPBuffer();
        if (inList) {
          blockHtml += listType === 'ul' ? '</ul>' : '</ol>';
          inList = false;
          listType = null;
        }
        const level = (line.match(/^#+/) || ['###'])[0].length;
        const tag = level <= 2 ? 'h3' : 'h4';
        blockHtml += `<${tag}>${formatInlineMarkdown(line.replace(/^#+\s*/, ''))}</${tag}>`;
      } else {
        if (inList) {
          blockHtml += listType === 'ul' ? '</ul>' : '</ol>';
          inList = false;
          listType = null;
        }
        pBuffer.push(line);
      }
    }

    flushPBuffer();
    if (inList) {
      blockHtml += listType === 'ul' ? '</ul>' : '</ol>';
    }

    if (blockHtml) formattedBlocks.push(blockHtml);
  }

  return formattedBlocks.join('');
}

async function submitAiCopilotQuery(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('aiCopilotInput');
  const chatBody = document.getElementById('aiCopilotChatBody');
  const sendBtn = document.getElementById('btnAiCopilotSend');
  if (!input || !chatBody) return;

  const question = input.value.trim();
  if (!question) return;

  // Add User Bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'ai-chat-bubble user';
  userBubble.textContent = question;
  chatBody.appendChild(userBubble);
  input.value = '';
  chatBody.scrollTop = chatBody.scrollHeight;

  // Add Thinking Bubble
  const thinkingBubble = document.createElement('div');
  thinkingBubble.className = 'ai-chat-bubble assistant';
  thinkingBubble.innerHTML = `<span class="ai-spin-icon">⚡</span> Analyzing live campus records...`;
  chatBody.appendChild(thinkingBubble);
  chatBody.scrollTop = chatBody.scrollHeight;

  if (sendBtn) sendBtn.disabled = true;

  try {
    const res = await apiFetch('/ai/admin/copilot-query', {
      method: 'POST',
      body: JSON.stringify({ question })
    });

    if (!res || !res.success) throw new Error(res?.message || 'Failed to query copilot');

    let contentHtml = `<div class="ai-response-formatted">${formatAiResponse(res.answer)}</div>`;

    // Render supporting data table if relevant
    if (res.queryType === 'overdue' && res.supportingData?.tickets?.length > 0) {
      contentHtml += `
        <div style="margin-top:10px;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Supporting Overdue Tickets:</div>
          <table>
            <thead><tr><th>Title</th><th>Dept</th><th>Deadline</th></tr></thead>
            <tbody>
              ${res.supportingData.tickets.slice(0, 5).map(t => `<tr><td>${t.title}</td><td>${t.dept}</td><td style="color:var(--danger);">${t.deadline || 'N/A'}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } else if (res.queryType === 'attendance' && res.supportingData?.lateHeads?.length > 0) {
      contentHtml += `
        <div style="margin-top:10px;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Late Department Heads Today:</div>
          <table>
            <thead><tr><th>Head</th><th>Punch In</th><th>Status</th></tr></thead>
            <tbody>
              ${res.supportingData.lateHeads.map(h => `<tr><td>${h.name}</td><td>${h.clockIn}</td><td style="color:#f59e0b;">${h.status}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }

    contentHtml += `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:8px; text-align:right;">Verified via MongoDB at ${res.timestamp || new Date().toLocaleTimeString()}</div>`;

    thinkingBubble.innerHTML = contentHtml;
    chatBody.scrollTop = chatBody.scrollHeight;
  } catch (err) {
    thinkingBubble.innerHTML = `<span style="color:var(--danger);">Error: ${err.message || 'Unable to process query.'}</span>`;
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

// ─── MODULE 2: AI SAFETY TRIAGE & HAZARD AUDIT ───────────────
async function loadComplaintTriageAdmin() {
  const radar = document.getElementById('aiSafetyRadarCard');
  const title = document.getElementById('aiRadarTitle');
  const sub = document.getElementById('aiRadarSubtitle');

  try {
    const res = await apiFetch('/ai/admin/triage-audit');
    if (!res || !res.success) return;

    activeTriageAuditMap = {};
    (res.items || []).forEach(item => {
      activeTriageAuditMap[String(item.id)] = item;
    });

    if (radar) {
      if (res.hazardCount > 0) {
        radar.style.display = 'flex';
        if (title) title.textContent = `🚨 ${res.hazardCount} Safety Hazard Ticket${res.hazardCount > 1 ? 's' : ''} Flagged`;
        if (sub) sub.textContent = `${res.escalationCount} ticket(s) contain potential safety hazards (sparks, smoke, or water risks).`;
      } else {
        radar.style.display = 'none';
      }
    }

    loadAllComplaints();
  } catch (err) {
    console.warn('loadComplaintTriageAdmin error:', err);
  }
}

function filterSafetyHazardsOnly(flaggedOnly) {
  filterOnlyHazardsMode = Boolean(flaggedOnly);
  loadAllComplaints();
}

async function escalateComplaintUrgency(complaintId, hazardType) {
  showCustomConfirm(
    '⚡ Escalate to High Priority',
    `Escalate this complaint to High Priority due to detected hazard (${hazardType || 'Safety Hazard'})?`,
    async () => {
      try {
        await apiFetch('/ai/admin/escalate-complaint', {
          method: 'POST',
          body: JSON.stringify({ complaintId, reason: `Safety hazard (${hazardType}) identified via AI triage audit.` })
        });
        showCustomAlert('Priority Escalated', 'Complaint has been successfully upgraded to High Priority.');
        loadComplaintTriageAdmin();
      } catch (err) {
        showCustomAlert('Error', err.message || 'Failed to escalate priority.');
      }
    }
  );
}

// ─── MODULE 2: INFRASTRUCTURE RISKS & PREDICTIVE MAINTENANCE ──
async function loadInfrastructureRisksAdmin() {
  const tbody = document.getElementById('adminInfraRisksBody');
  if (!tbody) return;

  try {
    const res = await apiFetch('/ai/admin/infrastructure-risks');
    if (!res || !res.success || !res.risks?.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:24px;">No recurring infrastructure breakdown clusters detected across campus.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    res.risks.forEach(r => {
      const riskClass = r.riskLevel === 'High' ? 'status-reopened' : r.riskLevel === 'Medium' ? 'status-pending' : 'status-progress';
      const evidenceList = (r.evidence || []).map(e => `• ${e.title} (${e.date})`).join('<br/>');

      tbody.innerHTML += `
        <tr>
          <td style="font-weight:600; color:var(--text-primary);">${r.block}</td>
          <td><span style="color:var(--accent); font-weight:600;">${r.category}</span></td>
          <td><strong>${r.incidentCount} tickets</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${r.highUrgencyCount} high urgency)</span></td>
          <td>
            <span class="status-badge ${riskClass}">
              ${r.riskLevel} (${r.estimatedRiskPct}% recurrence)
            </span>
          </td>
          <td style="font-size:0.78rem; color:var(--text-secondary); max-width:240px; line-height:1.4;">${evidenceList}</td>
          <td style="font-size:0.82rem; color:var(--text-primary);">${r.recommendedAction}</td>
        </tr>`;
    });
  } catch (err) {
    console.error('loadInfrastructureRisksAdmin error:', err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--danger); padding:24px;">Failed to load infrastructure risk assessment.</td></tr>';
  }
}

// ─── MODULE 3: INTELLIGENT LEAVE ADVISOR ─────────────────────
async function openLeaveAdvisorModal(leaveId) {
  try {
    const res = await apiFetch('/ai/admin/leave-advisor', {
      method: 'POST',
      body: JSON.stringify({ leaveId })
    });

    if (!res || !res.success) throw new Error(res?.message || 'Failed to analyze leave');

    const riskColor = res.riskLevel === 'High' ? 'var(--danger)' : res.riskLevel === 'Medium' ? '#f59e0b' : 'var(--success)';
    const reasonsHtml = (res.reasons || []).map(r => `<li style="margin-bottom:6px;">${r}</li>`).join('');

    const contentHtml = `
      <div style="margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h4 style="margin:0; font-size:1.02rem; font-weight:700; color:var(--text-primary);">${res.applicant}</h4>
          <span style="font-size:0.78rem; color:var(--text-muted);">${res.department} &nbsp;|&nbsp; ${res.dates}</span>
        </div>
        <span style="padding:4px 10px; border-radius:20px; font-weight:700; font-size:0.8rem; background:rgba(255,255,255,0.06); color:${riskColor}; border:1px solid ${riskColor};">
          ${res.riskLevel} Staffing Risk
        </span>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
        <div style="background:var(--bg-card); padding:10px; border-radius:8px; border:1px solid var(--border-color);">
          <span style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block;">Active Dept Tickets</span>
          <strong style="font-size:1.1rem; color:var(--text-primary);">${res.openTickets}</strong>
        </div>
        <div style="background:var(--bg-card); padding:10px; border-radius:8px; border:1px solid var(--border-color);">
          <span style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block;">Overlapping Leaves</span>
          <strong style="font-size:1.1rem; color:var(--text-primary);">${res.overlappingLeavesCount}</strong>
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <span style="font-size:0.78rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:6px;">Workforce Context:</span>
        <ul style="padding-left:18px; margin:0; font-size:0.83rem; color:var(--text-secondary); line-height:1.5;">
          ${reasonsHtml}
        </ul>
      </div>

      <div style="background:rgba(99,102,241,0.08); border-left:3px solid var(--accent); padding:10px 12px; border-radius:6px; font-size:0.83rem; color:var(--text-primary); line-height:1.4;">
        <strong>AI Recommendation:</strong> ${res.recommendation}
      </div>
    `;

    showCustomAlert('✨ AI Staffing Capacity Advisor', contentHtml);
    // Render HTML inside the modal alert
    const alertMsg = document.getElementById('globalAlertMsg');
    if (alertMsg) alertMsg.innerHTML = contentHtml;
  } catch (err) {
    showCustomAlert('Error', err.message || 'Unable to evaluate leave risk.');
  }
}

// ─── MODULE 3: ATTENDANCE ANOMALIES ─────────────────────────
async function loadAttendanceAnomaliesAdmin() {
  const container = document.getElementById('adminAttAnomalyList');
  const badge = document.getElementById('adminAttAnomalyBadge');
  const btn = document.getElementById('btnReauditAttendance') || document.querySelector('.btn-reaudit-logs');
  if (!container) return;

  // Immediate visual feedback on the button
  if (btn) {
    btn.classList.add('is-auditing');
    btn.innerHTML = `<svg class="reaudit-spin-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> <span>Auditing...</span>`;
  }
  container.style.opacity = '0.6';

  const resetBtn = (success = true) => {
    if (!btn) return;
    btn.classList.remove('is-auditing');
    if (success) {
      btn.classList.add('is-audited');
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> <span>Audited</span>`;
      setTimeout(() => {
        btn.classList.remove('is-audited');
        btn.innerHTML = `<svg class="reaudit-spin-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> <span>Re-audit Logs</span>`;
      }, 1400);
    } else {
      btn.innerHTML = `<svg class="reaudit-spin-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> <span>Re-audit Logs</span>`;
    }
  };

  try {
    const res = await apiFetch('/ai/admin/attendance-audit');
    if (!res || !res.success || !res.anomalies?.length) {
      container.innerHTML = '<span style="color:var(--success);">✓ All recent clock-in records are verified within campus geofence (500m) with standard shift durations.</span>';
      if (badge) badge.style.display = 'none';
      resetBtn(true);
      return;
    }

    if (badge) {
      badge.textContent = res.anomalyCount;
      badge.style.display = 'inline-flex';
    }

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${res.anomalies.map(a => `
          <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-left:3px solid ${a.severity === 'High' ? 'var(--danger)' : '#f59e0b'}; padding:10px 12px; border-radius:6px; display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
            <div>
              <strong style="color:var(--text-primary);">${a.name}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${a.dept} • ${a.date})</span>
              <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:3px;">${a.details}</div>
            </div>
            <span style="font-size:0.72rem; font-weight:700; color:${a.severity === 'High' ? 'var(--danger)' : '#f59e0b'}; text-transform:uppercase;">
              ${a.anomalyType}
            </span>
          </div>
        `).join('')}
      </div>
    `;
    resetBtn(true);
  } catch (err) {
    container.innerHTML = '<span style="color:var(--text-muted);">Attendance scans currently unavailable.</span>';
    resetBtn(false);
  } finally {
    container.style.opacity = '1';
  }
}

// ─── MODULE 3: PAYROLL ANOMALIES ────────────────────────────
async function loadPayrollAnomaliesAdmin() {
  const container = document.getElementById('adminPayrollAnomalyList');
  const badge = document.getElementById('adminPayrollAnomalyBadge');
  const btn = document.getElementById('btnReauditPayroll') || document.querySelector('.btn-reaudit-vouchers');
  if (!container) return;

  // Immediate visual feedback on the button
  if (btn) {
    btn.classList.add('is-auditing');
    btn.innerHTML = `<svg class="reaudit-spin-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> <span>Auditing...</span>`;
  }
  container.style.opacity = '0.6';

  const resetBtn = (success = true) => {
    if (!btn) return;
    btn.classList.remove('is-auditing');
    if (success) {
      btn.classList.add('is-audited');
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> <span>Audited</span>`;
      setTimeout(() => {
        btn.classList.remove('is-audited');
        btn.innerHTML = `<svg class="reaudit-spin-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> <span>Re-audit Vouchers</span>`;
      }, 1400);
    } else {
      btn.innerHTML = `<svg class="reaudit-spin-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> <span>Re-audit Vouchers</span>`;
    }
  };

  try {
    const res = await apiFetch('/ai/admin/payroll-audit?role=dept_head');
    if (!res || !res.success || !res.anomalies?.length) {
      container.innerHTML = `<span style="color:var(--success);">✓ All ${res.totalVouchersAudited || 0} Head payroll voucher(s) match approved compensation baselines with zero duplicate entries. Projected quarterly disbursements: ₹${(res.projectedQuarterExpenditure || 0).toLocaleString()}.</span>`;
      if (badge) badge.style.display = 'none';
      resetBtn(true);
      return;
    }

    if (badge) {
      badge.textContent = res.anomalyCount;
      badge.style.display = 'inline-flex';
    }

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${res.anomalies.map(a => `
          <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-left:3px solid ${a.severity === 'High' ? 'var(--danger)' : '#f59e0b'}; padding:10px 12px; border-radius:6px; display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
            <div>
              <strong style="color:var(--text-primary);">${a.name}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${a.period})</span>
              <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:3px;">${a.explanation}</div>
            </div>
            <span style="font-size:0.72rem; font-weight:700; color:${a.severity === 'High' ? 'var(--danger)' : '#f59e0b'}; text-transform:uppercase;">
              ${a.type}
            </span>
          </div>
        `).join('')}
      </div>
    `;
    resetBtn(true);
  } catch (err) {
    container.innerHTML = '<span style="color:var(--text-muted);">Payroll integrity scan currently unavailable.</span>';
    resetBtn(false);
  } finally {
    container.style.opacity = '1';
  }
}

// Global window attachments for inline event handlers
window.submitAiCopilotQuery = submitAiCopilotQuery;
window.fetchDailyAiBrief = fetchDailyAiBrief;
window.loadComplaintTriageAdmin = loadComplaintTriageAdmin;
window.filterSafetyHazardsOnly = filterSafetyHazardsOnly;
window.escalateComplaintUrgency = escalateComplaintUrgency;
window.loadInfrastructureRisksAdmin = loadInfrastructureRisksAdmin;
window.openLeaveAdvisorModal = openLeaveAdvisorModal;
window.loadAttendanceAnomaliesAdmin = loadAttendanceAnomaliesAdmin;
window.loadPayrollAnomaliesAdmin = loadPayrollAnomaliesAdmin;


