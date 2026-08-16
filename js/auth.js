// ============================================================
//  CampusFix — Auth JS
//  File: js/auth.js
//  Handles: Login portal selection, login form, session
// ============================================================

// Current selected role
let selectedRole = '';

const ROLE_CONFIG = {
  admin: {
    label:    '👑 Admin',
    title:    'Admin Portal',
    subtitle: 'Sign in to manage the entire campus',
    redirect: 'admin_dashboard.html',
    showSignup: false
  },
  dept_head: {
    label:    '👨‍💼 Department Head',
    title:    'Department Head Portal',
    subtitle: 'Sign in to manage your department',
    redirect: 'dept_head_dashboard.html',
    showSignup: false
  },
  student: {
    label:    '👨‍🎓 Student',
    title:    'Student Portal',
    subtitle: 'Sign in to report and track campus issues',
    redirect: 'student_dashboard.html',
    showSignup: true
  }
};

// ─── SHOW LOGIN FORM ─────────────────────────────────────────
function showLogin(role) {
  selectedRole = role;
  const cfg = ROLE_CONFIG[role];

  document.getElementById('loginRoleBadge').textContent = cfg.label;
  document.getElementById('loginTitle').textContent = cfg.title;
  document.getElementById('loginSubtitle').textContent = cfg.subtitle;

  // Show/hide sign up link for students only
  const signupLink = document.getElementById('signupLink');
  signupLink.classList.toggle('hidden', !cfg.showSignup);

  document.getElementById('portalSelect').classList.add('hidden');
  document.getElementById('loginPanel').classList.remove('hidden');

  // Clear previous inputs/errors
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').classList.add('hidden');
}

// ─── BACK TO PORTAL SELECTION ────────────────────────────────
function showPortalSelect() {
  document.getElementById('portalSelect').classList.remove('hidden');
  document.getElementById('loginPanel').classList.add('hidden');
  selectedRole = '';
}

// ─── TOGGLE PASSWORD VISIBILITY ──────────────────────────────
function togglePassword() {
  const input = document.getElementById('loginPassword');
  const btn   = document.getElementById('eyeBtn');
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

// ─── HANDLE LOGIN FORM SUBMIT ─────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl  = document.getElementById('loginError');
  const btnText  = document.getElementById('loginBtnText');

  // Loading state
  btnText.textContent = 'Signing in...';
  document.getElementById('loginSubmitBtn').disabled = true;
  errorEl.classList.add('hidden');

  try {
    const response = await fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: selectedRole })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      // Save session
      sessionStorage.setItem('cf_token', data.token);
      sessionStorage.setItem('cf_user',  JSON.stringify(data.user));
      sessionStorage.setItem('cf_role',  data.user.role);

      // Redirect to the correct dashboard
      const redirect = ROLE_CONFIG[data.user.role].redirect;
      window.location.href = redirect;
    } else {
      errorEl.textContent = data.message || 'Invalid email or password.';
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'Cannot connect to the server. Please make sure the backend is running.';
    errorEl.classList.remove('hidden');
  } finally {
    btnText.textContent = 'Sign In';
    document.getElementById('loginSubmitBtn').disabled = false;
  }
}

// ─── GUARD: If already logged in, redirect ───────────────────
(function checkSession() {
  const token = sessionStorage.getItem('cf_token');
  const role  = sessionStorage.getItem('cf_role');
  if (token && role && ROLE_CONFIG[role]) {
    window.location.href = ROLE_CONFIG[role].redirect;
  }
})();
