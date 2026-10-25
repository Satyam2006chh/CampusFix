

const BASE_URL = 'http://localhost:5000/api';


const token = sessionStorage.getItem('cf_token');
const userStr = sessionStorage.getItem('cf_user');
let currentUser = null;

if (!token || !userStr) {
  window.location.href = 'login.html';
} else {
  currentUser = JSON.parse(userStr);
  
 
  const nameDisplay = document.getElementById('userNameDisplay');
  const avatarDisplay = document.getElementById('userAvatar');
  if (nameDisplay) nameDisplay.textContent = currentUser.name;
  if (avatarDisplay) avatarDisplay.textContent = currentUser.name.charAt(0).toUpperCase();
}

function logout() {

  fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  }).catch(() => {});
  
  sessionStorage.clear();
  window.location.href = 'login.html';
}


async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {})
  };
  
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });
  
  const data = await response.json();
  if (response.status === 401) {
    // Token expired or invalid
    sessionStorage.clear();
    window.location.href = 'login.html';
    return null;
  }
  
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }
  
  return data;
}

const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const tabId = item.getAttribute('data-tab');
    if (tabId) switchTab(tabId);
  });
});

function switchTab(tabId) {
  
  navItems.forEach(i => i.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (activeNav) activeNav.classList.add('active');
  
  
  tabPanes.forEach(pane => pane.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  

  const titles = {
    'overview': 'Dashboard Overview',
    'new-complaint': 'Report an Issue',
    'my-complaints': 'My Complaints',
    'dept-complaints': 'Department Complaints',
    'employees': 'Manage Staff',
    'dh-my-attendance': 'My Attendance',
    'dh-attendance': 'Staff Attendance',
    'dh-leaves': 'Leave Requests',
    'dh-payslips': 'Payslips',
    'attendance': 'Attendance',
    'head-attendance': 'Department Head Attendance Analytics',
    'head-leaves': 'Department Head Leave Management',
    'head-payslips': 'Department Head Payslips',
    'leave': 'Leave Management',
    'payslips': 'Payslips',
    'my-complaints': 'My Tasks',
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl && titles[tabId]) {
    titleEl.textContent = titles[tabId];
  }

  // Auto-load tab data when switching
  if (tabId === 'my-complaints'       && typeof loadMyTasks === 'function') loadMyTasks();
  if (tabId === 'attendance'          && typeof loadAttendance === 'function') loadAttendance();
  if (tabId === 'dh-my-attendance'    && typeof loadHeadMyAttendance === 'function') loadHeadMyAttendance();
  if (tabId === 'head-attendance'     && typeof loadHeadAttendanceAnalytics === 'function') loadHeadAttendanceAnalytics();
  if (tabId === 'head-leaves'         && typeof loadHeadLeavesAdmin === 'function') loadHeadLeavesAdmin();
  if (tabId === 'head-payslips'       && typeof loadHeadPayslipsAdmin === 'function') loadHeadPayslipsAdmin();
  if (tabId === 'leave'               && typeof loadLeaves === 'function') loadLeaves();
  if (tabId === 'payslips'            && typeof loadPayslips === 'function') loadPayslips();
}


function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getStatusBadge(status) {
  const map = {
    'Pending': 'status-pending',
    'In Progress': 'status-progress',
    'Waiting Confirmation': 'status-waiting',
    'Closed': 'status-closed',
    'Reopened': 'status-reopened',
    'Overdue': 'status-overdue'
  };
  const cls = map[status] || 'status-pending';
  return `<span class="status-badge ${cls}">${status}</span>`;
}


function createGlobalModals() {
  if (document.getElementById('globalAlertModal')) return;
  const modalHTML = `
    <div id="globalAlertModal" class="modal hidden" style="z-index:9999;">
      <div class="modal-content" style="max-width:380px;">
        <div class="modal-header" style="margin-bottom:12px;">
          <h3 class="modal-title" id="globalAlertTitle">Notification</h3>
          <button class="modal-close-btn" onclick="document.getElementById('globalAlertModal').classList.add('hidden')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p id="globalAlertMsg" style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:24px;line-height:1.6;"></p>
        <button class="btn-primary btn-full" onclick="document.getElementById('globalAlertModal').classList.add('hidden')">OK</button>
      </div>
    </div>

    <div id="globalConfirmModal" class="modal hidden" style="z-index:9999;">
      <div class="modal-content" style="max-width:380px;">
        <div class="modal-header" style="margin-bottom:12px;">
          <h3 class="modal-title" id="globalConfirmTitle">Confirm Action</h3>
        </div>
        <p id="globalConfirmMsg" style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:24px;line-height:1.6;"></p>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button class="btn-ghost" onclick="window._confirmCb(false)">Cancel</button>
          <button id="globalConfirmYesBtn" class="btn-primary" onclick="window._confirmCb(true)"
            style="background:var(--danger);">Yes, Proceed</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}
document.addEventListener('DOMContentLoaded', createGlobalModals);


window.showCustomAlert = function(titleOrMsg, msg) {
  const message = msg !== undefined ? msg : titleOrMsg;
  document.getElementById('globalAlertMsg').textContent = message;
  document.getElementById('globalAlertModal').classList.remove('hidden');
};


window.showCustomConfirm = function(titleOrMsg, msgOrCallback, callbackArg) {
  let message, callback;
  if (typeof msgOrCallback === 'function') {

    message  = titleOrMsg;
    callback = msgOrCallback;
  } else {

    message  = msgOrCallback;
    callback = callbackArg;
  }
  document.getElementById('globalConfirmMsg').textContent = message;
  document.getElementById('globalConfirmModal').classList.remove('hidden');
  window._confirmCb = function(result) {
    document.getElementById('globalConfirmModal').classList.add('hidden');
    if (result) callback();  
  };
};

window.showToastNotification = function(text, type = 'info', duration = 4500) {
  let container = document.getElementById('cfToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'cfToastContainer';
    container.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'cf-toast-item';
  const borderColor = type === 'danger' ? 'var(--danger, #ef4444)' : type === 'warning' ? '#f59e0b' : 'var(--accent, #6366f1)';
  toast.style.cssText = `
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--bg-card, #1e293b);
    color: var(--text-primary, #ffffff);
    border: 1px solid var(--border-color, rgba(255,255,255,0.12));
    border-left: 4px solid ${borderColor};
    border-radius: 8px;
    padding: 12px 18px;
    font-size: 0.86rem;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5), 0 0 15px rgba(245, 158, 11, 0.25);
    transform: translateX(120%);
    opacity: 0;
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    max-width: 380px;
  `;

  toast.innerHTML = `
    <div style="flex:1; line-height:1.4;">${text}</div>
    <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:2px 6px;" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, duration);
};
