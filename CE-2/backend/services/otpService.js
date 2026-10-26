const https = require('https');

// ── In-memory OTP store ─────────────────────────────────────────
const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeOTP(email, otp, name, purpose = 'general') {
  const minutes = parseInt(process.env.OTP_EXPIRE_MINUTES || '10', 10);
  otpStore.set(email.toLowerCase(), {
    otp, name, purpose, verified: false,
    expiresAt: Date.now() + minutes * 60 * 1000,
  });
}

function verifyOTP(email, enteredOtp) {
  const record = otpStore.get(email.toLowerCase());
  if (!record) return { valid: false, reason: 'No verification code found. Please request a new one.' };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return { valid: false, reason: 'Code expired. Please request a new one.' };
  }
  if (record.otp !== enteredOtp.toString().trim()) return { valid: false, reason: 'Incorrect code. Please check your email.' };
  otpStore.delete(email.toLowerCase());
  return { valid: true };
}

function verifyResetOTP(email, enteredOtp) {
  const record = otpStore.get(email.toLowerCase());
  if (!record) return { valid: false, reason: 'No reset request found.' };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return { valid: false, reason: 'Code expired.' };
  }
  if (record.otp !== enteredOtp.toString().trim()) return { valid: false, reason: 'Incorrect code.' };
  record.verified = true;
  return { valid: true };
}

function isResetVerified(email) {
  const r = otpStore.get(email.toLowerCase());
  if (!r || Date.now() > r.expiresAt) { otpStore.delete(email.toLowerCase()); return false; }
  return r.verified === true;
}

function clearResetSession(email) { otpStore.delete(email.toLowerCase()); }

// ── Email HTML template ─────────────────────────────────────────
function buildEmailHTML(name, otp, minutes, purpose = 'registration') {
  const isReset = purpose === 'password_reset';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
  <span style="font-size:22px;font-weight:900;color:#fff;background:#4f46e5;padding:8px 14px;border-radius:8px;">Campus<span style="color:#a5b4fc;">Fix</span></span>
</td></tr>
<tr><td style="background:#13131f;padding:36px 40px;border:1px solid rgba(99,102,241,0.15);border-top:none;">
  <h1 style="color:#f1f5f9;font-size:24px;margin:0 0 12px;">${isReset ? 'Reset Your Password' : 'Verify Your Email'}</h1>
  <p style="color:#94a3b8;font-size:15px;margin:0 0 28px;">Hey <strong style="color:#e2e8f0;">${name}</strong>, your code expires in <strong style="color:#a5b4fc;">${minutes} minutes</strong>.</p>
  <div style="background:rgba(79,70,229,0.12);border:2px solid rgba(99,102,241,0.5);border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
    <p style="color:#6366f1;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin:0 0 8px;">Your Verification Code</p>
    <p style="font-size:48px;font-weight:900;letter-spacing:12px;color:#fff;font-family:'Courier New',monospace;margin:0;">${otp}</p>
  </div>
  <p style="color:#fca5a5;font-size:13px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:12px 16px;margin:0;">Never share this code. CampusFix will never ask for it.</p>
</td></tr>
<tr><td style="background:#0d0d17;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border:1px solid rgba(99,102,241,0.15);border-top:none;">
  <p style="color:#475569;font-size:12px;margin:0;">© 2026 CampusFix. All rights reserved.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

// ── Send OTP via SendGrid HTTPS API (port 443 — works on Render) ─
async function sendOTPEmail(email, name = 'Student', purpose = 'registration') {
  const otp = generateOTP();
  const minutes = parseInt(process.env.OTP_EXPIRE_MINUTES || '10', 10);
  storeOTP(email, otp, name, purpose);

  const isReset = purpose === 'password_reset';
  const subject = isReset
    ? `${otp} is your CampusFix password reset code`
    : `${otp} is your CampusFix verification code`;

  const payload = JSON.stringify({
    personalizations: [{ to: [{ email }] }],
    from: { email: process.env.SENDGRID_FROM_EMAIL, name: 'CampusFix Security' },
    subject,
    content: [{ type: 'text/html', value: buildEmailHTML(name, otp, minutes, purpose) }],
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.sendgrid.com',
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 202) {
          console.log(`✅ OTP sent via SendGrid to ${email}`);
          resolve({ otp, expiresAt: Date.now() + minutes * 60 * 1000 });
        } else {
          console.error(`❌ SendGrid error ${res.statusCode}:`, body);
          reject(new Error(`SendGrid error: ${res.statusCode} — ${body}`));
        }
      });
    });
    req.on('error', (e) => reject(new Error(`SendGrid request failed: ${e.message}`)));
    req.write(payload);
    req.end();
  });
}

module.exports = {
  sendOTPEmail, verifyOTP, verifyResetOTP,
  isResetVerified, clearResetSession, generateOTP, storeOTP,
};
