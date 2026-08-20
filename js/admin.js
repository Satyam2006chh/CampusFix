// ============================================================
//  CampusFix - Admin Dashboard Logic
//  File: js/admin.js
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  if (currentUser.role !== "admin") { window.location.href = "login.html"; return; }
  loadStats(); loadAllComplaints(); loadDepartments(); loadLocations(); loadUsers();
});

async function loadStats() {
  try {
    const data = await apiFetch("/admin/stats");
    document.getElementById("aStatTotal").textContent      = data.stats.total || 0;
    document.getElementById("aStatPending").textContent    = data.stats.pending || 0;
    document.getElementById("aStatInProgress").textContent = data.stats.in_progress || 0;
    document.getElementById("aStatResolved").textContent   = data.stats.resolved || 0;
    const dBody = document.getElementById("deptStatsBody"); dBody.innerHTML = "";
    data.by_dept.forEach(d => { dBody.innerHTML += `<tr><td>${d.dept_name}</td><td>${d.count}</td></tr>`; });
    const bBody = document.getElementById("blockStatsBody"); bBody.innerHTML = "";
    data.by_block.forEach(b => { bBody.innerHTML += `<tr><td>${b.block}</td><td>${b.count}</td></tr>`; });
  } catch (err) { console.error(err); }
}

async function loadAllComplaints() {
  try {
    const filtDept = document.getElementById("filtDept").value;
    const filtStatus = document.getElementById("filtStatus").value;
    let url = "/admin/complaints?";
    if (filtDept) url += `dept_id=${filtDept}&`;
    if (filtStatus) url += `status=${filtStatus}`;
    const complaints = await apiFetch(url);
    const tbody = document.getElementById("globalComplaintsBody"); tbody.innerHTML = "";
    if (!complaints.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px;">No complaints found.</td></tr>'; return; }
    complaints.forEach(c => {
      tbody.innerHTML += `<tr>
        <td style="font-weight:600;color:var(--purple-light);">#CF-${c.complaint_id}</td>
        <td><div style="font-weight:600;color:var(--text-primary);margin-bottom:2px;">${c.title}</div><div style="font-size:0.75rem;color:var(--text-muted);">${c.block||""}, ${c.room_area||""}</div></td>
        <td>${c.dept_name||"Unassigned"}</td><td>${getStatusBadge(c.status)}</td>
        <td style="color:var(--text-secondary);">${formatDate(c.created_at)}</td></tr>`;
    });
  } catch (err) { console.error(err); }
}

let allDepts = [];
async function loadDepartments() {
  try {
    allDepts = await apiFetch("/admin/departments");
    const grid = document.getElementById("deptsGrid");
    const filtDept = document.getElementById("filtDept");
    const hDept = document.getElementById("hDept");
    filtDept.innerHTML = '<option value="">All Departments</option>';
    hDept.innerHTML = '<option value="" disabled selected>Select Dept</option>';
    grid.innerHTML = "";
    if (!allDepts.length) { grid.innerHTML = '<p style="color:var(--text-muted);padding:24px;text-align:center;">No departments yet.</p>'; return; }
    allDepts.forEach(d => {
      const ini = d.name.split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase();
      const headBadge = d.head_name
        ? `<span style="color:var(--green);font-size:0.82rem;font-weight:600;">${d.head_name}</span><div style="font-size:0.73rem;color:var(--text-muted);margin-top:2px;">${d.head_email||""}</div>`
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
            <div style="font-size:.78rem;color:var(--text-muted);"><span style="color:var(--text-secondary);font-weight:600;">${d.total_complaints}</span> issue${d.total_complaints!==1?"s":""}</div>
            ${!d.head_name?`<button onclick="openAddHeadModal()" style="background:rgba(108,99,255,.12);border:1px solid rgba(108,99,255,.3);color:var(--purple-light);padding:6px 14px;border-radius:8px;font-size:.78rem;font-weight:600;cursor:pointer;">+ Assign Head</button>`:""}
          </div>
        </div>`;
      filtDept.innerHTML += `<option value="${d.dept_id}">${d.name}</option>`;
      if (!d.head_name) hDept.innerHTML += `<option value="${d.dept_id}">${d.name}</option>`;
    });
  } catch (err) { console.error(err); }
}

async function loadLocations() {
  try {
    const locs = await apiFetch("/admin/locations");
    const tbody = document.getElementById("locationsBody"); tbody.innerHTML = "";
    locs.forEach(l => { tbody.innerHTML += `<tr><td>${l.campus}</td><td>${l.block}</td><td>${l.floor}</td><td>${l.room_area}</td></tr>`; });
  } catch (err) { console.error(err); }
}

async function loadUsers() {
  try {
    const roleFilt = document.getElementById("userFiltRole").value;
    let url = "/admin/users"; if (roleFilt) url += `?role=${roleFilt}`;
    const users = await apiFetch(url);
    const grid = document.getElementById("usersGrid"); grid.innerHTML = "";
    if (!users.length) { grid.innerHTML = '<p style="color:var(--text-muted);padding:24px;text-align:center;">No users found.</p>'; return; }
    users.forEach(u => {
      const ini = u.name.split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase();
      const isActive = u.is_active;
      const roleColor = u.role==="admin"?"#00d4ff":u.role==="dept_head"?"var(--yellow)":"var(--purple-light)";
      const roleLabel = u.role==="dept_head"?"Dept Head":u.role.charAt(0).toUpperCase()+u.role.slice(1);
      let actionBtn = "";
      if (u.role !== "admin") {
        actionBtn = isActive
          ? `<button onclick="toggleUserStatus(${u.user_id},false)" style="flex:1;padding:9px;font-size:.8rem;background:rgba(255,92,122,.08);border:1px solid rgba(255,92,122,.2);color:var(--red);border-radius:8px;cursor:pointer;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>Deactivate</button>`
          : `<button onclick="toggleUserStatus(${u.user_id},true)" style="flex:1;padding:9px;font-size:.8rem;background:rgba(0,229,160,.08);border:1px solid rgba(0,229,160,.2);color:var(--green);border-radius:8px;cursor:pointer;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Activate</button>`;
      }
      grid.innerHTML += `
        <div style="background:var(--bg-card);border:1px solid var(--border-light);border-radius:16px;padding:28px 22px;display:flex;flex-direction:column;align-items:center;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.15);position:relative;transition:transform .2s ease;">
          <div style="position:absolute;top:14px;right:14px;"><span style="background:${isActive?"rgba(0,229,160,.1)":"rgba(255,92,122,.1)"};color:${isActive?"var(--green)":"var(--red)"};padding:3px 10px;border-radius:20px;font-size:.68rem;font-weight:700;letter-spacing:.5px;">${isActive?"ACTIVE":"INACTIVE"}</span></div>
          <div style="width:78px;height:78px;border-radius:50%;background:rgba(108,99,255,.1);border:2px solid rgba(108,99,255,.2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.7rem;color:var(--purple);margin-top:10px;margin-bottom:16px;">${ini}</div>
          <div style="font-weight:700;color:var(--text-primary);font-size:1.05rem;margin-bottom:4px;">${u.name}</div>
          <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:12px;">${u.email}</div>
          <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;justify-content:center;">
            <span style="background:rgba(255,255,255,.05);color:${roleColor};padding:3px 12px;border-radius:20px;font-size:.72rem;font-weight:700;letter-spacing:.5px;">${roleLabel}</span>
            ${u.dept_name?`<span style="background:rgba(255,255,255,.05);color:var(--text-secondary);padding:3px 12px;border-radius:20px;font-size:.72rem;">${u.dept_name}</span>`:""}
          </div>
          ${actionBtn?`<div style="display:flex;width:100%;gap:8px;">${actionBtn}</div>`:`<div style="font-size:.78rem;color:var(--text-muted);background:rgba(255,255,255,.03);padding:8px 16px;border-radius:8px;width:100%;">System Administrator</div>`}
        </div>`;
    });
  } catch (err) { console.error(err); }
}

async function toggleUserStatus(userId, activate) {
  const action = activate ? "activate" : "deactivate";
  const label  = activate ? "Activate" : "Deactivate";
  showCustomConfirm(
    `${label} User`,
    `Are you sure you want to ${action} this user? ${!activate ? "They will be locked out immediately on their next login attempt." : "They will regain access immediately."}`,
    async () => {
      try {
        await apiFetch(`/admin/users/${userId}/${action}`, { method: "POST" });
        showCustomAlert(`${label} User`, `User has been ${action}d successfully.`);
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
  injectPasswordMeter('hPass', 'head-pw-meter');
}
function openLocModal()     { document.getElementById("addLocModal").classList.remove("hidden"); }

async function submitDept(e) {
  e.preventDefault();
  clearAllErrors(e.target);

  // ── Validation ──────────────────────────────────────────
  let ok = true;
  ok = validateRequired('dName', 'Department name') && ok;
  ok = validateRequired('dTag',  'Category tag')    && ok;
  if (!ok) return;
  // ────────────────────────────────────────────────────────

  try {
    await apiFetch("/admin/departments", {method:"POST", body:JSON.stringify({name:document.getElementById("dName").value, category_tag:document.getElementById("dTag").value, description:document.getElementById("dDesc").value})});
    closeModals(); e.target.reset(); loadDepartments(); showCustomAlert("Success","Department added!");
  } catch (err) { showCustomAlert("Error", err.message||"Failed."); }
}

async function submitHead(e) {
  e.preventDefault();
  clearAllErrors(e.target);

  // ── Validation ──────────────────────────────────────────
  let ok = true;
  ok = validateSelect('hDept',    'department')   && ok;
  ok = validateRequired('hName',  'Name')         && ok;
  ok = validateEmail('hEmail')                    && ok;
  ok = validateStrongPassword('hPass')            && ok;
  ok = validatePhone('hPhone')                    && ok;
  if (!ok) return;
  // ────────────────────────────────────────────────────────

  try {
    await apiFetch("/admin/dept-heads", {method:"POST", body:JSON.stringify({department_id:document.getElementById("hDept").value, name:document.getElementById("hName").value, email:document.getElementById("hEmail").value, password:document.getElementById("hPass").value, phone:document.getElementById("hPhone").value})});
    closeModals(); e.target.reset(); loadDepartments(); loadUsers(); showCustomAlert("Success","Department Head assigned!");
  } catch (err) { showCustomAlert("Error", err.message||"Failed."); }
}

async function submitLoc(e) {
  e.preventDefault();
  clearAllErrors(e.target);

  // ── Validation ──────────────────────────────────────────
  let ok = true;
  ok = validateRequired('lCampus', 'Campus')    && ok;
  ok = validateRequired('lBlock',  'Block')     && ok;
  ok = validateRequired('lFloor',  'Floor')     && ok;
  ok = validateRequired('lRoom',   'Room/Area') && ok;
  if (!ok) return;
  // ────────────────────────────────────────────────────────

  try {
    await apiFetch("/admin/locations", {method:"POST", body:JSON.stringify({campus:document.getElementById("lCampus").value, block:document.getElementById("lBlock").value, floor:document.getElementById("lFloor").value, room_area:document.getElementById("lRoom").value})});
    closeModals(); e.target.reset(); loadLocations(); showCustomAlert("Success","Location added!");
  } catch (err) { showCustomAlert("Error", err.message||"Failed."); }
}
