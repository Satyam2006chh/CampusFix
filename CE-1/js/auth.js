let selectedRole = '';

const ROLE_CONFIG = {
  admin: {
    label:    'Admin',
    title:    'Admin Portal',
    subtitle: 'Sign in to manage the entire campus',
    redirect: 'admin_dashboard.html',
    showSignup: false
  },
  dept_head: {
    label:    'Department Head',
    title:    'Department Head Portal',
    subtitle: 'Sign in to manage your department',
    redirect: 'dept_head_dashboard.html',
    showSignup: false
  },
  student: {
    label:    'Student',
    title:    'Student Portal',
    subtitle: 'Sign in to report and track campus issues',
    redirect: 'student_dashboard.html',
    showSignup: true
  }
};

function showLogin(role) {
  selectedRole = role;
  const cfg = ROLE_CONFIG[role];

  document.getElementById('loginRoleBadge').textContent = cfg.label;
  document.getElementById('loginTitle').textContent = cfg.title;
  document.getElementById('loginSubtitle').textContent = cfg.subtitle;

  const signupLink = document.getElementById('signupLink');
  signupLink.classList.toggle('hidden', !cfg.showSignup);

  document.getElementById('portalSelect').classList.add('hidden');
  document.getElementById('loginPanel').classList.remove('hidden');

  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').classList.add('hidden');
}

function showPortalSelect() {
  document.getElementById('portalSelect').classList.remove('hidden');
  document.getElementById('loginPanel').classList.add('hidden');
  selectedRole = '';
}

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

async function handleLogin(e) {
  e.preventDefault();

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl  = document.getElementById('loginError');
  const btnText  = document.getElementById('loginBtnText');

  errorEl.classList.add('hidden');
  clearAllErrors(document.getElementById('loginForm'));

  let ok = true;
  ok = validateEmail('loginEmail')                      && ok;
  ok = validateRequired('loginPassword', 'Password')    && ok;

  btnText.textContent = 'Signing in...';
  document.getElementById('loginSubmitBtn').disabled = true;

  try {
    const response = await fetch(`/users?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&role=${encodeURIComponent(selectedRole)}`);

    const users = await response.json();

    if (response.ok && users.length > 0) {
      const user = users[0];
      if (user.is_active === 0) {
        errorEl.textContent = 'Account disabled by Admin.';
        errorEl.classList.remove('hidden');
        return;
      }
      
      // Save session
      sessionStorage.setItem('cf_token', 'fake-jwt-token-for-json-server');
      sessionStorage.setItem('cf_user',  JSON.stringify(user));
      sessionStorage.setItem('cf_role',  user.role);

      const redirect = ROLE_CONFIG[user.role].redirect;
      window.location.href = redirect;
    } else {
      errorEl.textContent = 'Invalid email or password.';
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'Cannot connect to the JSON server. Make sure it is running on port 3000.';
    errorEl.classList.remove('hidden');
  } finally {
    btnText.textContent = 'Sign In';
    document.getElementById('loginSubmitBtn').disabled = false;
  }
}

(function checkSession() {
  const token = sessionStorage.getItem('cf_token');
  const role  = sessionStorage.getItem('cf_role');
  if (token && role && ROLE_CONFIG[role]) {
    window.location.href = ROLE_CONFIG[role].redirect;
  }
})();
