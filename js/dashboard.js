// ============================================================
//  CampusFix — Shared Dashboard JS
//  File: js/dashboard.js
//  Handles: Session check, tabs, common helpers
// ============================================================

const BASE_URL = 'http://127.0.0.1:5000/api';

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
    'Reopened': 'status-reopened'
  };
  const cls = map[status] || 'status-pending';
  return `<span class="status-badge ${cls}">${status}</span>`;
}
