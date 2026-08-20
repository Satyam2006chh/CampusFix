// ============================================================
//  CampusFix — Shared Dashboard JS
//  File: js/dashboard.js
//  Handles: Session check, tabs, common helpers
// ============================================================

const BASE_URL = 'http://localhost:3000';

// ─── SESSION MANAGEMENT ──────────────────────────────────────
const token = sessionStorage.getItem('cf_token');
const userStr = sessionStorage.getItem('cf_user');
let currentUser = null;

if (!token || !userStr) {
  window.location.href = 'login.html';
} else {
  currentUser = JSON.parse(userStr);
  
  // Set UI User details if elements exist
  const nameDisplay = document.getElementById('userNameDisplay');
  const avatarDisplay = document.getElementById('userAvatar');
  if (nameDisplay) nameDisplay.textContent = currentUser.name;
  if (avatarDisplay) avatarDisplay.textContent = currentUser.name.charAt(0).toUpperCase();
}

function logout() {
  // Optional backend logout call
  fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  }).catch(() => {});
  
  sessionStorage.clear();
  window.location.href = 'login.html';
}

// ─── API HELPER ──────────────────────────────────────────────
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

// ─── TAB NAVIGATION ──────────────────────────────────────────
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
  // Update nav active state
  navItems.forEach(i => i.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (activeNav) activeNav.classList.add('active');
  
  // Show correct pane
  tabPanes.forEach(pane => pane.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  
  // Update Title
  const titles = {
    'overview': 'Dashboard Overview',
    'new-complaint': 'Report an Issue',
    'my-complaints': 'My Complaints',
    'dept-complaints': 'Department Complaints',
    'employees': 'Manage Staff'
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl && titles[tabId]) {
    titleEl.textContent = titles[tabId];
  }
}

// ─── HELPERS ─────────────────────────────────────────────────
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

// ─── CUSTOM MODALS (Overrides alert & confirm) ───────────────
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

// showCustomAlert(title, msg) OR showCustomAlert(msg)
window.showCustomAlert = function(titleOrMsg, msg) {
  const message = msg !== undefined ? msg : titleOrMsg;
  document.getElementById('globalAlertMsg').textContent = message;
  document.getElementById('globalAlertModal').classList.remove('hidden');
};

// showCustomConfirm(title, msg, callback) OR showCustomConfirm(msg, callback)
window.showCustomConfirm = function(titleOrMsg, msgOrCallback, callbackArg) {
  let message, callback;
  if (typeof msgOrCallback === 'function') {
    // Called as showCustomConfirm(msg, callback)
    message  = titleOrMsg;
    callback = msgOrCallback;
  } else {
    // Called as showCustomConfirm(title, msg, callback)
    message  = msgOrCallback;
    callback = callbackArg;
  }
  document.getElementById('globalConfirmMsg').textContent = message;
  document.getElementById('globalConfirmModal').classList.remove('hidden');
  window._confirmCb = function(result) {
    document.getElementById('globalConfirmModal').classList.add('hidden');
    if (result) callback();   // only fire callback when user clicks "Yes"
  };
};
