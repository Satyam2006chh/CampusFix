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
  if (tabId === 'dh-attendance') loadDeptAttendance();
  if (tabId === 'dh-leaves')     loadDeptLeaves();
  if (tabId === 'dh-payslips')   { loadDeptPayslips(); populatePayslipEmpSelect(); }
};

// ── Populate employee filter on DOMContentLoaded ────────────
document.addEventListener('DOMContentLoaded', () => {
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
      const statusClass = r.status === 'Present' ? 'status-closed' : r.status === 'Late' ? 'status-pending' : 'status-reopened';
      tbody.innerHTML += `
        <tr>
          <td style="font-weight:600;color:var(--text-primary);">${empName}</td>
          <td>${r.date}</td>
          <td>${r.clock_in || '—'}</td>
          <td>${r.clock_out || '—'}</td>
          <td>${r.working_hours ? r.working_hours.toFixed(1) + ' hrs' : '—'}</td>
          <td><span class="status-badge ${statusClass}">${r.status || 'Present'}</span></td>
        </tr>`;
    });
  } catch (err) { console.error('loadDeptAttendance', err); }
}

// ── LEAVE REQUESTS (Dept Head view) ──────────────────────
async function loadDeptLeaves() {
  if (!myDept) return;
  try {
    const leaves = await apiFetch(`/leaves?department_id=${myDept.id}`);
    const sorted = (leaves || []).sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));

    const tbody = document.getElementById('dhLeaveBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No leave applications found.</td></tr>`;
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
async function loadDeptPayslips() {
  if (!myDept) return;
  try {
    const slips = await apiFetch(`/payslips?department_id=${myDept.id}`);
    const sorted = (slips || []).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });

    const tbody = document.getElementById('dhPayslipBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px;">No payslips generated yet.</td></tr>`;
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
    department_id: myDept.id,
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
