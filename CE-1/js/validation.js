
const PW_RULES = [
  { re: /.{8,}/,   id: 'rule-length',    text: 'At least 8 characters'          },
  { re: /[A-Z]/,   id: 'rule-upper',     text: 'At least 1 uppercase letter'    },
  { re: /[a-z]/,   id: 'rule-lower',     text: 'At least 1 lowercase letter'    },
  { re: /[0-9]/,   id: 'rule-number',    text: 'At least 1 number'              },
  { re: /[^A-Za-z0-9]/, id: 'rule-special', text: 'At least 1 special character (@#$%! etc.)' },
];


function checkPasswordStrength(password) {
  const missing = PW_RULES
    .filter(r => !r.re.test(password))
    .map(r => r.text);
  return { valid: missing.length === 0, missing };
}


function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.add('cf-input-error');

  
  let errSpan = field.parentElement.querySelector('.cf-field-error');
  if (!errSpan) {
    const wrapper = field.closest('.password-wrapper') || field.closest('.cf-input-wrap');
    const parent  = wrapper ? wrapper.parentElement : field.parentElement;
    errSpan = parent.querySelector('.cf-field-error');
    if (!errSpan) {
      errSpan = document.createElement('span');
      errSpan.className = 'cf-field-error';
      if (wrapper) {
        wrapper.after(errSpan);
      } else {
        field.after(errSpan);
      }
    }
  }
  errSpan.textContent = message;
  errSpan.style.display = 'block';
}


function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.remove('cf-input-error');
  const wrapper = field.closest('.password-wrapper') || field.closest('.cf-input-wrap');
  const parent  = wrapper ? wrapper.parentElement : field.parentElement;
  const errSpan = parent ? parent.querySelector('.cf-field-error') : null;
  if (errSpan) errSpan.style.display = 'none';
}


function clearAllErrors(containerEl) {
  if (!containerEl) return;
  containerEl.querySelectorAll('.cf-input-error').forEach(el => el.classList.remove('cf-input-error'));
  containerEl.querySelectorAll('.cf-field-error').forEach(el => { el.style.display = 'none'; });
}



function validateRequired(fieldId, label) {
  const val = (document.getElementById(fieldId)?.value || '').trim();
  if (!val) { showFieldError(fieldId, `${label} is required.`); return false; }
  clearFieldError(fieldId);
  return true;
}

function validateEmail(fieldId) {
  const val = (document.getElementById(fieldId)?.value || '').trim();
  if (!val) { showFieldError(fieldId, 'Email address is required.'); return false; }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(val)) { showFieldError(fieldId, 'Please enter a valid email address.'); return false; }
  clearFieldError(fieldId);
  return true;
}


function validateStrongPassword(fieldId) {
  const val = document.getElementById(fieldId)?.value || '';
  if (!val) { showFieldError(fieldId, 'Password is required.'); return false; }
  const { valid, missing } = checkPasswordStrength(val);
  if (!valid) {
    showFieldError(fieldId, `Password needs: ${missing[0]}.`);
    return false;
  }
  clearFieldError(fieldId);
  return true;
}

function validatePasswordMatch(pw1Id, pw2Id) {
  const pw1 = document.getElementById(pw1Id)?.value || '';
  const pw2 = document.getElementById(pw2Id)?.value || '';
  if (!pw2) { showFieldError(pw2Id, 'Please confirm your password.'); return false; }
  if (pw1 !== pw2) { showFieldError(pw2Id, 'Passwords do not match.'); return false; }
  clearFieldError(pw2Id);
  return true;
}

function validatePhone(fieldId) {
  const val = (document.getElementById(fieldId)?.value || '').trim();
  if (!val) return true; // phone is optional everywhere
  if (!/^\d{10}$/.test(val)) { showFieldError(fieldId, 'Phone must be a 10-digit number.'); return false; }
  clearFieldError(fieldId);
  return true;
}

function validateSelect(fieldId, label) {
  const val = document.getElementById(fieldId)?.value || '';
  if (!val) { showFieldError(fieldId, `Please select a ${label}.`); return false; }
  clearFieldError(fieldId);
  return true;
}


function injectPasswordMeter(fieldId, meterId) {
  const field = document.getElementById(fieldId);
  if (!field || document.getElementById(meterId)) return;

  const wrapper = field.closest('.password-wrapper') || field.parentElement;

  const meter = document.createElement('div');
  meter.id = meterId;
  meter.className = 'cf-pw-meter';
  meter.innerHTML = `
    <div class="cf-pw-bar-track">
      <div class="cf-pw-bar" id="${meterId}-bar"></div>
    </div>
    <ul class="cf-pw-rules" id="${meterId}-rules">
      ${PW_RULES.map(r => `<li id="${meterId}-${r.id}" class="cf-rule">
        <span class="cf-rule-icon">✕</span> ${r.text}
      </li>`).join('')}
    </ul>`;

  wrapper.after(meter);

  field.addEventListener('input', () => updatePasswordMeter(field.value, meterId));
}

function updatePasswordMeter(password, meterId) {
  let passed = 0;
  PW_RULES.forEach(r => {
    const ok  = r.re.test(password);
    const li  = document.getElementById(`${meterId}-${r.id}`);
    if (li) {
      li.classList.toggle('cf-rule-pass', ok);
      li.querySelector('.cf-rule-icon').textContent = ok ? '✓' : '✕';
    }
    if (ok) passed++;
  });

  const bar = document.getElementById(`${meterId}-bar`);
  if (!bar) return;
  const pct = (passed / PW_RULES.length) * 100;
  bar.style.width = pct + '%';
  bar.className   = 'cf-pw-bar';
  if (passed <= 1)      bar.classList.add('cf-bar-weak');
  else if (passed <= 3) bar.classList.add('cf-bar-fair');
  else if (passed === 4) bar.classList.add('cf-bar-good');
  else                  bar.classList.add('cf-bar-strong');
}
