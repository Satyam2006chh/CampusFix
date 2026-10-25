const BASE_URL = 'http://localhost:5000/api';

let selectedRole = '';
let currentStudentAuth = {
  email: '',
  name: '',
  uid: ''
};
let otpTimerInterval = null;

const ROLE_CONFIG = {
  admin: {
    label:    'Admin',
    title:    'Admin Portal',
    subtitle: 'Sign in to manage the entire campus',
    redirect: '../html/admin_dashboard.html',
    showSignup: false
  },
  dept_head: {
    label:    'Department Head',
    title:    'Department Head Portal',
    subtitle: 'Sign in to manage your department',
    redirect: '../html/dept_head_dashboard.html',
    showSignup: false
  },
  student: {
    label:    'Student',
    title:    'Student Portal',
    subtitle: 'Sign in to report and track campus issues',
    redirect: '../html/student_dashboard.html',
    showSignup: true
  },
  employee: {
    label:    'Employee',
    title:    'Employee Portal',
    subtitle: 'Sign in to view your tasks and attendance',
    redirect: '../html/employee_dashboard.html',
    showSignup: false
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

  // Student portal specific view
  const studentAuthSection = document.getElementById('studentAuthSection');
  if (studentAuthSection) {
    studentAuthSection.classList.toggle('hidden', role !== 'student');
  }

  const domainBlockedPanel = document.getElementById('domainBlockedPanel');
  if (domainBlockedPanel) domainBlockedPanel.classList.add('hidden');

  const otpPanel = document.getElementById('otpPanel');
  if (otpPanel) otpPanel.classList.add('hidden');

  document.getElementById('portalSelect').classList.add('hidden');
  document.getElementById('loginPanel').classList.remove('hidden');

  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').classList.add('hidden');
}

function showPortalSelect() {
  document.getElementById('portalSelect').classList.remove('hidden');
  document.getElementById('loginPanel').classList.add('hidden');
  const otpPanel = document.getElementById('otpPanel');
  if (otpPanel) otpPanel.classList.add('hidden');
  selectedRole = '';
  clearInterval(otpTimerInterval);
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

// ─── STUDENT GOOGLE SIGN-IN & OTP FLOW ────────────────────────

async function handleStudentGoogleAuth() {
  const loginError = document.getElementById('loginError');
  const domainBlockedPanel = document.getElementById('domainBlockedPanel');
  const blockedEmailDisplay = document.getElementById('blockedEmailDisplay');

  loginError.classList.add('hidden');
  if (domainBlockedPanel) domainBlockedPanel.classList.add('hidden');

  const authBtn = document.getElementById('studentGoogleBtn');
  const originalBtnHtml = authBtn.innerHTML;
  authBtn.disabled = true;
  authBtn.style.opacity = '0.7';

  try {
    const authResult = await triggerGoogleSignIn();
    if (!authResult || !authResult.success) {
      if (authResult && authResult.error) {
        loginError.textContent = authResult.error;
        loginError.classList.remove('hidden');
      }
      return;
    }

    const { email, name, uid } = authResult;
    currentStudentAuth = { email, name, uid };

    // Check Chitkara domain
    const emailLower = email.toLowerCase().trim();
    if (!emailLower.endsWith('@chitkara.edu.in')) {
      if (domainBlockedPanel && blockedEmailDisplay) {
        blockedEmailDisplay.textContent = email;
        domainBlockedPanel.classList.remove('hidden');
      } else {
        loginError.textContent = 'Access restricted to Chitkara University students (@chitkara.edu.in).';
        loginError.classList.remove('hidden');
      }
      return;
    }

    // Email is valid Chitkara ID -> Request OTP
    authBtn.innerHTML = `<span>Sending security code...</span>`;

    const response = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailLower, name: name || 'Student' })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Transition to OTP verification panel
      showOtpVerificationScreen(emailLower);
    } else {
      if (data.code === 'DOMAIN_BLOCKED' && domainBlockedPanel) {
        blockedEmailDisplay.textContent = email;
        domainBlockedPanel.classList.remove('hidden');
      } else {
        loginError.textContent = data.message || 'Failed to send verification code. Please try again.';
        loginError.classList.remove('hidden');
      }
    }
  } catch (err) {
    console.error('Google Auth / OTP error:', err);
    loginError.textContent = 'Cannot connect to backend server. Make sure port 5000 is active.';
    loginError.classList.remove('hidden');
  } finally {
    authBtn.disabled = false;
    authBtn.style.opacity = '1';
    authBtn.innerHTML = originalBtnHtml;
  }
}

function showOtpVerificationScreen(email) {
  document.getElementById('loginPanel').classList.add('hidden');
  const otpPanel = document.getElementById('otpPanel');
  otpPanel.classList.remove('hidden');

  document.getElementById('otpEmailTarget').textContent = email;
  document.getElementById('otpError').classList.add('hidden');

  // Clear boxes
  const boxes = document.querySelectorAll('#otpBoxes .otp-box');
  boxes.forEach(b => {
    b.value = '';
    b.disabled = false;
  });
  if (boxes[0]) boxes[0].focus();

  setupOtpBoxListeners();
  startOtpCountdown(10 * 60); // 10 minutes
}

function backToLoginFromOtp() {
  document.getElementById('otpPanel').classList.add('hidden');
  document.getElementById('loginPanel').classList.remove('hidden');
  clearInterval(otpTimerInterval);
}

function setupOtpBoxListeners() {
  const boxes = Array.from(document.querySelectorAll('#otpBoxes .otp-box'));

  boxes.forEach((box, idx) => {
    box.onkeydown = (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        boxes[idx - 1].focus();
      }
    };

    box.oninput = (e) => {
      const val = box.value.replace(/[^0-9]/g, '');
      box.value = val ? val[0] : '';

      if (box.value && idx < boxes.length - 1) {
        boxes[idx + 1].focus();
      }

      // Check if all boxes filled
      const fullOtp = boxes.map(b => b.value).join('');
      if (fullOtp.length === 6) {
        submitOtpVerification();
      }
    };

    box.onpaste = (e) => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
      if (paste.length > 0) {
        for (let i = 0; i < boxes.length; i++) {
          boxes[i].value = paste[i] || '';
        }
        const lastIdx = Math.min(paste.length - 1, boxes.length - 1);
        boxes[lastIdx].focus();
        if (paste.length >= 6) {
          submitOtpVerification();
        }
      }
    };
  });
}

function startOtpCountdown(secondsRemaining) {
  clearInterval(otpTimerInterval);
  const countdownEl = document.getElementById('otpCountdown');
  const resendBtn = document.getElementById('resendOtpBtn');

  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.style.opacity = '0.5';
  }

  let totalSecs = secondsRemaining;
  let elapsed = 0;

  function update() {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    countdownEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    elapsed++;
    if (elapsed >= 30 && resendBtn) {
      resendBtn.disabled = false;
      resendBtn.style.opacity = '1';
    }

    if (totalSecs <= 0) {
      clearInterval(otpTimerInterval);
      countdownEl.textContent = 'Expired';
      const otpError = document.getElementById('otpError');
      otpError.textContent = 'Security code has expired. Please click "Resend Code" to get a new code.';
      otpError.classList.remove('hidden');
    }
    totalSecs--;
  }

  update();
  otpTimerInterval = setInterval(update, 1000);
}

async function submitOtpVerification() {
  const boxes = Array.from(document.querySelectorAll('#otpBoxes .otp-box'));
  const otp = boxes.map(b => b.value.trim()).join('');
  const otpError = document.getElementById('otpError');
  const verifyBtn = document.getElementById('verifyOtpBtn');
  const btnText = document.getElementById('verifyOtpBtnText');

  otpError.classList.add('hidden');

  if (otp.length < 6) {
    otpError.textContent = 'Please enter the complete 6-digit verification code.';
    otpError.classList.remove('hidden');
    return;
  }

  btnText.textContent = 'Verifying Code...';
  verifyBtn.disabled = true;

  try {
    const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentStudentAuth.email,
        otp: otp,
        name: currentStudentAuth.name,
        googleUid: currentStudentAuth.uid
      })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      const user = data.user;
      btnText.textContent = '✓ Verified! Redirecting...';
      verifyBtn.style.background = '#10b981';

      sessionStorage.setItem('cf_token', data.token);
      sessionStorage.setItem('cf_user',  JSON.stringify(user));
      sessionStorage.setItem('cf_role',  'student');

      clearInterval(otpTimerInterval);

      setTimeout(() => {
        window.location.href = ROLE_CONFIG.student.redirect;
      }, 700);
    } else {
      otpError.textContent = data.message || 'Invalid or expired verification code. Please check your email.';
      otpError.classList.remove('hidden');
      boxes.forEach(b => b.classList.add('shake'));
      setTimeout(() => boxes.forEach(b => b.classList.remove('shake')), 400);
    }
  } catch (err) {
    console.error('Verify OTP error:', err);
    otpError.textContent = 'Network error during verification. Check backend connection.';
    otpError.classList.remove('hidden');
  } finally {
    verifyBtn.disabled = false;
    if (btnText.textContent !== '✓ Verified! Redirecting...') {
      btnText.textContent = 'Verify & Enter Dashboard →';
    }
  }
}

async function resendStudentOtp() {
  const resendBtn = document.getElementById('resendOtpBtn');
  const otpError = document.getElementById('otpError');

  resendBtn.disabled = true;
  resendBtn.textContent = 'Sending...';
  otpError.classList.add('hidden');

  try {
    const response = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentStudentAuth.email,
        name: currentStudentAuth.name
      })
    });

    const data = await response.json();
    if (response.ok && data.success) {
      resendBtn.textContent = 'Code Sent!';
      startOtpCountdown(10 * 60);
      const boxes = document.querySelectorAll('#otpBoxes .otp-box');
      boxes.forEach(b => b.value = '');
      if (boxes[0]) boxes[0].focus();
      setTimeout(() => { resendBtn.textContent = 'Resend Code'; }, 3000);
    } else {
      otpError.textContent = data.message || 'Failed to resend code. Please try again.';
      otpError.classList.remove('hidden');
      resendBtn.textContent = 'Resend Code';
      resendBtn.disabled = false;
    }
  } catch (err) {
    otpError.textContent = 'Network error while resending code.';
    otpError.classList.remove('hidden');
    resendBtn.textContent = 'Resend Code';
    resendBtn.disabled = false;
  }
}

// ─── STANDARD FORM LOGIN ──────────────────────────────────────

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
  if (!ok) return;

  btnText.textContent = 'Signing in...';
  document.getElementById('loginSubmitBtn').disabled = true;

  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: selectedRole })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      const user = data.user;

      if (user.is_active === 0) {
        errorEl.textContent = 'Account disabled by Admin.';
        errorEl.classList.remove('hidden');
        return;
      }

      // Save session
      sessionStorage.setItem('cf_token', data.token);
      sessionStorage.setItem('cf_user',  JSON.stringify(user));
      sessionStorage.setItem('cf_role',  user.role);

      window.location.href = ROLE_CONFIG[user.role].redirect;
    } else {
      errorEl.textContent = data.message || 'Invalid email or password.';
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'Cannot connect to the server. Make sure it is running on port 5000.';
    errorEl.classList.remove('hidden');
  } finally {
    btnText.textContent = 'Sign In →';
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
