const BASE_URL = 'http://localhost:5000/api';
const INTERNAL_COLLEGE_DOMAIN = 'chitkara.edu.in';

let selectedRole = '';
let forgotState = {
  email: '',
  otp: ''
};
let forgotTimerInterval = null;

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
  selectedRole = role || 'student';
  const cfg = ROLE_CONFIG[selectedRole] || ROLE_CONFIG.student;

  document.getElementById('loginRoleBadge').textContent = cfg.label;
  document.getElementById('loginTitle').textContent = cfg.title;
  document.getElementById('loginSubtitle').textContent = cfg.subtitle;

  const signupLink = document.getElementById('signupLink');
  if (signupLink) signupLink.classList.toggle('hidden', !cfg.showSignup);

  document.getElementById('portalSelect').classList.add('hidden');
  const forgotPanel = document.getElementById('forgotPasswordPanel');
  if (forgotPanel) forgotPanel.classList.add('hidden');

  document.getElementById('loginPanel').classList.remove('hidden');

  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').classList.add('hidden');
}

function showPortalSelect() {
  document.getElementById('portalSelect').classList.remove('hidden');
  document.getElementById('loginPanel').classList.add('hidden');
  const forgotPanel = document.getElementById('forgotPasswordPanel');
  if (forgotPanel) forgotPanel.classList.add('hidden');
  selectedRole = '';
  clearInterval(forgotTimerInterval);
}

function togglePassword() {
  togglePasswordVisibility('loginPassword', 'eyeBtn');
}

function togglePasswordVisibility(inputId, btnId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
}

// ─── LOGIN SUBMIT ─────────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl  = document.getElementById('loginError');
  const btnText  = document.getElementById('loginBtnText');

  errorEl.classList.add('hidden');
  clearAllErrors(document.getElementById('loginForm'));

  let ok = true;
  ok = validateEmail('loginEmail')                   && ok;
  ok = validateRequired('loginPassword', 'Password') && ok;
  if (!ok) return;

  btnText.textContent = 'Signing in...';
  document.getElementById('loginSubmitBtn').disabled = true;

  try {
    const roleToSend = selectedRole || 'student';
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: roleToSend })
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

      // Redirect directly to the dashboard
      window.location.href = ROLE_CONFIG[user.role].redirect;
    } else {
      errorEl.textContent = data.message || 'Invalid email or password.';
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'Cannot connect to the server. Make sure port 5000 is active.';
    errorEl.classList.remove('hidden');
  } finally {
    btnText.textContent = 'Sign In →';
    document.getElementById('loginSubmitBtn').disabled = false;
  }
}

// ─── FORGOT PASSWORD WORKFLOW ─────────────────────────────────

function openForgotPassword() {
  document.getElementById('loginPanel').classList.add('hidden');
  const forgotPanel = document.getElementById('forgotPasswordPanel');
  forgotPanel.classList.remove('hidden');

  // Reset steps
  document.getElementById('forgotStep1').classList.remove('hidden');
  document.getElementById('forgotStep2').classList.add('hidden');
  document.getElementById('forgotStep3').classList.add('hidden');

  document.getElementById('forgotDomainCard').classList.add('hidden');
  document.getElementById('forgotError1').classList.add('hidden');

  // Pre-fill email if present in login field
  const loginEmailVal = document.getElementById('loginEmail').value.trim();
  if (loginEmailVal) {
    document.getElementById('forgotEmail').value = loginEmailVal;
  }
  document.getElementById('forgotEmail').focus();
}

function backToLoginFromForgot() {
  clearInterval(forgotTimerInterval);
  document.getElementById('forgotPasswordPanel').classList.add('hidden');
  document.getElementById('loginPanel').classList.remove('hidden');
}

// Step 1: Send Reset Code
async function handleSendForgotOtp(e) {
  e.preventDefault();

  const emailInput = document.getElementById('forgotEmail');
  const email = emailInput.value.trim().toLowerCase();
  const domainCard = document.getElementById('forgotDomainCard');
  const errorEl = document.getElementById('forgotError1');
  const submitBtn = document.getElementById('forgotSubmitBtn1');
  const btnText = document.getElementById('forgotSubmitBtnText1');

  domainCard.classList.add('hidden');
  errorEl.classList.add('hidden');

  // Check college domain internally
  if (!email.endsWith('@' + INTERNAL_COLLEGE_DOMAIN)) {
    domainCard.classList.remove('hidden');
    return;
  }

  forgotState.email = email;
  btnText.textContent = 'Sending Verification Code...';
  submitBtn.disabled = true;

  try {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // Transition to Step 2: OTP screen
      document.getElementById('forgotStep1').classList.add('hidden');
      document.getElementById('forgotStep2').classList.remove('hidden');
      document.getElementById('forgotTargetEmail').textContent = email;
      document.getElementById('forgotError2').classList.add('hidden');

      const boxes = document.querySelectorAll('#forgotOtpBoxes .otp-box');
      boxes.forEach(b => { b.value = ''; b.disabled = false; });
      if (boxes[0]) boxes[0].focus();

      setupForgotOtpBoxInputs();
      startForgotOtpCountdown(10 * 60);
    } else {
      if (data.code === 'DOMAIN_BLOCKED') {
        domainCard.classList.remove('hidden');
      } else {
        errorEl.textContent = data.message || 'Failed to send reset code.';
        errorEl.classList.remove('hidden');
      }
    }
  } catch (err) {
    errorEl.textContent = 'Network error. Make sure backend port 5000 is running.';
    errorEl.classList.remove('hidden');
  } finally {
    btnText.textContent = 'Send Verification Code →';
    submitBtn.disabled = false;
  }
}

function setupForgotOtpBoxInputs() {
  const boxes = Array.from(document.querySelectorAll('#forgotOtpBoxes .otp-box'));
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
      const fullOtp = boxes.map(b => b.value).join('');
      if (fullOtp.length === 6) {
        handleVerifyForgotOtp();
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
          handleVerifyForgotOtp();
        }
      }
    };
  });
}

function startForgotOtpCountdown(secondsRemaining) {
  clearInterval(forgotTimerInterval);
  const countdownEl = document.getElementById('forgotOtpCountdown');
  const resendBtn = document.getElementById('forgotResendBtn');
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
      clearInterval(forgotTimerInterval);
      countdownEl.textContent = 'Expired';
      const otpError = document.getElementById('forgotError2');
      otpError.textContent = 'Verification code has expired. Please request a new one.';
      otpError.classList.remove('hidden');
    }
    totalSecs--;
  }

  update();
  forgotTimerInterval = setInterval(update, 1000);
}

// Step 2: Verify Reset OTP
async function handleVerifyForgotOtp() {
  const boxes = Array.from(document.querySelectorAll('#forgotOtpBoxes .otp-box'));
  const otp = boxes.map(b => b.value.trim()).join('');
  const errorEl = document.getElementById('forgotError2');
  const verifyBtn = document.getElementById('forgotVerifyBtn');
  const btnText = document.getElementById('forgotVerifyBtnText');

  errorEl.classList.add('hidden');

  if (otp.length < 6) {
    errorEl.textContent = 'Please enter the complete 6-digit verification code.';
    errorEl.classList.remove('hidden');
    return;
  }

  forgotState.otp = otp;
  btnText.textContent = 'Verifying Code...';
  verifyBtn.disabled = true;

  try {
    const res = await fetch(`${BASE_URL}/auth/verify-reset-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotState.email, otp })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      clearInterval(forgotTimerInterval);
      // Transition to Step 3: Set New Password
      document.getElementById('forgotStep2').classList.add('hidden');
      document.getElementById('forgotStep3').classList.remove('hidden');
      document.getElementById('newPasswordInput').value = '';
      document.getElementById('confirmNewPasswordInput').value = '';
      document.getElementById('forgotError3').classList.add('hidden');
      document.getElementById('newPasswordInput').focus();
    } else {
      errorEl.textContent = data.message || 'Invalid or expired verification code.';
      errorEl.classList.remove('hidden');
      boxes.forEach(b => b.classList.add('shake'));
      setTimeout(() => boxes.forEach(b => b.classList.remove('shake')), 400);
    }
  } catch (err) {
    errorEl.textContent = 'Network error while verifying code.';
    errorEl.classList.remove('hidden');
  } finally {
    verifyBtn.disabled = false;
    btnText.textContent = 'Verify Code & Continue →';
  }
}

async function resendForgotOtp() {
  const resendBtn = document.getElementById('forgotResendBtn');
  const errorEl = document.getElementById('forgotError2');

  resendBtn.disabled = true;
  resendBtn.textContent = 'Sending...';
  errorEl.classList.add('hidden');

  try {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotState.email })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      resendBtn.textContent = 'Code Sent!';
      startForgotOtpCountdown(10 * 60);
      const boxes = document.querySelectorAll('#forgotOtpBoxes .otp-box');
      boxes.forEach(b => b.value = '');
      if (boxes[0]) boxes[0].focus();
      setTimeout(() => { resendBtn.textContent = 'Resend Code'; }, 3000);
    } else {
      errorEl.textContent = data.message || 'Failed to resend code.';
      errorEl.classList.remove('hidden');
      resendBtn.textContent = 'Resend Code';
      resendBtn.disabled = false;
    }
  } catch (err) {
    errorEl.textContent = 'Network error while resending code.';
    errorEl.classList.remove('hidden');
    resendBtn.textContent = 'Resend Code';
    resendBtn.disabled = false;
  }
}

// Step 3: Submit New Password
async function handleResetPassword(e) {
  e.preventDefault();

  const newPass = document.getElementById('newPasswordInput').value;
  const confirmPass = document.getElementById('confirmNewPasswordInput').value;
  const errorEl = document.getElementById('forgotError3');
  const submitBtn = document.getElementById('resetPasswordSubmitBtn');
  const btnText = document.getElementById('resetPasswordSubmitBtnText');

  errorEl.classList.add('hidden');

  if (newPass.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters long.';
    errorEl.classList.remove('hidden');
    return;
  }

  if (newPass !== confirmPass) {
    errorEl.textContent = 'Passwords do not match. Please re-enter.';
    errorEl.classList.remove('hidden');
    return;
  }

  btnText.textContent = 'Updating Password...';
  submitBtn.disabled = true;

  try {
    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: forgotState.email,
        newPassword: newPass
      })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      btnText.textContent = '✓ Updated! Returning to Sign In...';
      submitBtn.style.background = '#10b981';

      setTimeout(() => {
        // Return to login screen (Screenshot 3)
        showLogin(selectedRole || 'student');
        document.getElementById('loginEmail').value = forgotState.email;
        const successBanner = document.getElementById('loginSuccessBanner');
        if (successBanner) {
          successBanner.textContent = '✓ Password updated successfully! Please sign in with your new password.';
          successBanner.classList.remove('hidden');
        }
      }, 1000);
    } else {
      errorEl.textContent = data.message || 'Failed to reset password. Please try again.';
      errorEl.classList.remove('hidden');
      submitBtn.disabled = false;
      btnText.textContent = 'Update Password & Sign In →';
    }
  } catch (err) {
    errorEl.textContent = 'Network error while resetting password.';
    errorEl.classList.remove('hidden');
    submitBtn.disabled = false;
    btnText.textContent = 'Update Password & Sign In →';
  }
}

// ─── INITIALIZATION & QUERY PARAM HANDLING ────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const portal = urlParams.get('portal');
  const email = urlParams.get('email');
  const registered = urlParams.get('registered');

  if (portal && ROLE_CONFIG[portal]) {
    // Automatically open Screenshot 3
    showLogin(portal);

    if (email) {
      const emailField = document.getElementById('loginEmail');
      if (emailField) emailField.value = decodeURIComponent(email);
    }

    if (registered === 'true') {
      const successBanner = document.getElementById('loginSuccessBanner');
      if (successBanner) {
        successBanner.textContent = '✓ Account registered successfully! Please enter your password to sign in.';
        successBanner.classList.remove('hidden');
      }
    }
  }
});

(function checkSession() {
  const token = sessionStorage.getItem('cf_token');
  const role  = sessionStorage.getItem('cf_role');
  if (token && role && ROLE_CONFIG[role]) {
    window.location.href = ROLE_CONFIG[role].redirect;
  }
})();
