const nodemailer = require('nodemailer');

// ── In-memory OTP store { email -> { otp, expiresAt, name, verified } } ──
const otpStore = new Map();

// ── Generate a 6-digit OTP ──────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Store OTP with expiry ───────────────────────────────────────
function storeOTP(email, otp, name, purpose = 'general') {
  const minutes = parseInt(process.env.OTP_EXPIRE_MINUTES || '10', 10);
  const expiresAt = Date.now() + minutes * 60 * 1000;
  otpStore.set(email.toLowerCase(), { otp, expiresAt, name, purpose, verified: false });
}

// ── Verify OTP ──────────────────────────────────────────────────
function verifyOTP(email, enteredOtp) {
  const record = otpStore.get(email.toLowerCase());
  if (!record) return { valid: false, reason: 'No verification code found. Please request a new one.' };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return { valid: false, reason: 'Verification code has expired. Please request a new one.' };
  }
  if (record.otp !== enteredOtp.toString().trim()) {
    return { valid: false, reason: 'Incorrect verification code. Please check your email and try again.' };
  }
  otpStore.delete(email.toLowerCase()); // one-time use
  return { valid: true };
}

// ── Verify Password Reset OTP (marks verified so new password can be set) ──
function verifyResetOTP(email, enteredOtp) {
  const record = otpStore.get(email.toLowerCase());
  if (!record) return { valid: false, reason: 'No reset request found. Please request a code first.' };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return { valid: false, reason: 'Reset code has expired. Please request a new one.' };
  }
  if (record.otp !== enteredOtp.toString().trim()) {
    return { valid: false, reason: 'Incorrect verification code. Please try again.' };
  }
  // Mark as verified for password change step
  record.verified = true;
  return { valid: true };
}

function isResetVerified(email) {
  const record = otpStore.get(email.toLowerCase());
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return false;
  }
  return record.verified === true;
}

function clearResetSession(email) {
  otpStore.delete(email.toLowerCase());
}

// ── Nodemailer transporter ──────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ── Styled email HTML template ──────────────────────────────────
function buildEmailHTML(name, otp, minutes, purpose = 'registration') {
  const isReset = purpose === 'password_reset';
  const headingText = isReset ? 'Reset Your Password 🔑' : 'Verify Your College Email 🔐';
  const introText = isReset
    ? `Hey <strong style="color:#e2e8f0;">${name}</strong>,<br/>We received a request to reset your CampusFix password. Use the security code below to set a new password. It expires in <strong style="color:#a5b4fc;">${minutes} minutes</strong>.`
    : `Hey <strong style="color:#e2e8f0;">${name}</strong>, welcome to CampusFix!<br/>Use the security code below to complete your verification. It expires in <strong style="color:#a5b4fc;">${minutes} minutes</strong>.`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>CampusFix – Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e1b4b 100%);
                        border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;
                        border-bottom:1px solid rgba(99,102,241,0.3);">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
                <tr>
                  <td style="background:#4f46e5;border-radius:10px;padding:10px 14px;vertical-align:middle;">
                    <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;
                                  font-family:'Segoe UI',Arial,sans-serif;">
                      Campus<span style="color:#a5b4fc;">Fix</span>
                    </span>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#c7d2fe;font-size:13px;letter-spacing:2px;text-transform:uppercase;
                          font-weight:600;">
                Campus Operations &amp; Issue Resolution Platform
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#13131f;padding:40px 40px 32px;border-left:1px solid rgba(99,102,241,0.15);
                        border-right:1px solid rgba(99,102,241,0.15);">

              <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:26px;font-weight:700;line-height:1.3;">
                ${headingText}
              </h1>
              <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.6;">
                ${introText}
              </p>

              <!-- OTP Box -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:linear-gradient(135deg,rgba(79,70,229,0.15),rgba(99,102,241,0.08));
                                border:2px solid rgba(99,102,241,0.5);border-radius:16px;
                                padding:28px 48px;text-align:center;">
                      <p style="margin:0 0 6px;color:#6366f1;font-size:12px;letter-spacing:3px;
                                  text-transform:uppercase;font-weight:700;">Your Verification Code</p>
                      <p style="margin:0;font-size:48px;font-weight:900;letter-spacing:12px;
                                  color:#fff;font-family:'Courier New',monospace;
                                  text-shadow:0 0 20px rgba(99,102,241,0.5);">
                        ${otp}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security notice -->
              <table cellpadding="0" cellspacing="0" width="100%"
                      style="background:rgba(239,68,68,0.06);border-radius:12px;
                              border:1px solid rgba(239,68,68,0.2);margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#fca5a5;font-size:13px;line-height:1.5;">
                      ⚠️ <strong>Security Notice:</strong> Never share this code with anyone. CampusFix administrators will never ask for your verification code.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0d0d17;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;
                        border:1px solid rgba(99,102,241,0.15);border-top:none;">
              <p style="margin:0 0 6px;color:#64748b;font-size:12px;">
                This is an automated security email sent from <a href="mailto:campusfix.noreply@gmail.com" style="color:#818cf8;text-decoration:none;">campusfix.noreply@gmail.com</a>
              </p>
              <p style="margin:0;color:#475569;font-size:11px;">
                © 2026 CampusFix. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

// ── Send OTP Email ──────────────────────────────────────────────
async function sendOTPEmail(email, name = 'Student', purpose = 'registration') {
  const otp = generateOTP();
  const minutes = parseInt(process.env.OTP_EXPIRE_MINUTES || '10', 10);

  storeOTP(email, otp, name, purpose);

  const isReset = purpose === 'password_reset';
  const mailOptions = {
    from: `"CampusFix Security" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: isReset
      ? `${otp} is your CampusFix password reset code`
      : `${otp} is your CampusFix verification code`,
    html: buildEmailHTML(name, otp, minutes, purpose),
  };

  await transporter.sendMail(mailOptions);
  return { otp, expiresAt: Date.now() + minutes * 60 * 1000 };
}

module.exports = {
  sendOTPEmail,
  verifyOTP,
  verifyResetOTP,
  isResetVerified,
  clearResetSession,
  generateOTP,
  storeOTP,
};
