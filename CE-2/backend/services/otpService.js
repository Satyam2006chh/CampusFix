const nodemailer = require('nodemailer');

// ── In-memory OTP store { email -> { otp, expiresAt, name } } ──
const otpStore = new Map();

// ── Generate a 6-digit OTP ──────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Store OTP with expiry ───────────────────────────────────────
function storeOTP(email, otp, name) {
  const minutes = parseInt(process.env.OTP_EXPIRE_MINUTES || '10', 10);
  const expiresAt = Date.now() + minutes * 60 * 1000;
  otpStore.set(email.toLowerCase(), { otp, expiresAt, name });
}

// ── Verify OTP ──────────────────────────────────────────────────
function verifyOTP(email, enteredOtp) {
  const record = otpStore.get(email.toLowerCase());
  if (!record) return { valid: false, reason: 'No OTP found. Please request a new one.' };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return { valid: false, reason: 'OTP has expired. Please request a new one.' };
  }
  if (record.otp !== enteredOtp.toString()) {
    return { valid: false, reason: 'Incorrect OTP. Please try again.' };
  }
  otpStore.delete(email.toLowerCase()); // one-time use
  return { valid: true };
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
function buildEmailHTML(name, otp, minutes) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>CampusFix – OTP Verification</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e1b4b 100%);
                        border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;
                        border-bottom:1px solid rgba(99,102,241,0.3);">
              <!-- Logo -->
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
                Chitkara University · Student Portal
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#13131f;padding:40px 40px 32px;border-left:1px solid rgba(99,102,241,0.15);
                        border-right:1px solid rgba(99,102,241,0.15);">

              <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:26px;font-weight:700;line-height:1.3;">
                Verify your email 🔐
              </h1>
              <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Hey <strong style="color:#e2e8f0;">${name}</strong>, welcome to CampusFix!<br/>
                Use the OTP below to complete your login. It expires in <strong style="color:#a5b4fc;">${minutes} minutes</strong>.
              </p>

              <!-- OTP Box -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:linear-gradient(135deg,rgba(79,70,229,0.15),rgba(99,102,241,0.08));
                                border:2px solid rgba(99,102,241,0.5);border-radius:16px;
                                padding:28px 48px;text-align:center;">
                      <p style="margin:0 0 6px;color:#6366f1;font-size:12px;letter-spacing:3px;
                                  text-transform:uppercase;font-weight:700;">Your One-Time Password</p>
                      <p style="margin:0;font-size:48px;font-weight:900;letter-spacing:12px;
                                  color:#fff;font-family:'Courier New',monospace;
                                  text-shadow:0 0 20px rgba(99,102,241,0.5);">
                        ${otp}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Steps -->
              <table cellpadding="0" cellspacing="0" width="100%"
                      style="background:rgba(99,102,241,0.06);border-radius:12px;
                              border:1px solid rgba(99,102,241,0.15);margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;color:#94a3b8;font-size:13px;font-weight:600;
                                text-transform:uppercase;letter-spacing:1px;">
                      How to use
                    </p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;color:#c7d2fe;font-size:14px;">
                          <span style="color:#6366f1;margin-right:10px;">①</span>
                          Go back to the CampusFix Student Portal
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#c7d2fe;font-size:14px;">
                          <span style="color:#6366f1;margin-right:10px;">②</span>
                          Enter the 6-digit OTP in the verification box
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#c7d2fe;font-size:14px;">
                          <span style="color:#6366f1;margin-right:10px;">③</span>
                          Click "Verify OTP" to access your dashboard
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table cellpadding="0" cellspacing="0" width="100%"
                      style="background:rgba(239,68,68,0.08);border-radius:10px;
                              border-left:4px solid #ef4444;margin-bottom:8px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;color:#fca5a5;font-size:13px;line-height:1.6;">
                      <strong>⚠️ Never share this OTP with anyone.</strong> CampusFix team will never ask for it.
                      If you didn't request this, please ignore this email.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0d0d1a;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;
                        border:1px solid rgba(99,102,241,0.15);border-top:none;">
              <p style="margin:0 0 6px;color:#4b5563;font-size:12px;">
                © 2026 CampusFix · Dept. of Computer Science, Chitkara University
              </p>
              <p style="margin:0;color:#374151;font-size:11px;">
                Built with ❤️ &amp; passion by Satyam Chhabra
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ── Send OTP Email ──────────────────────────────────────────────
async function sendOTPEmail(email, name) {
  const otp = generateOTP();
  const minutes = parseInt(process.env.OTP_EXPIRE_MINUTES || '10', 10);
  storeOTP(email, otp, name);

  const mailOptions = {
    from: `"CampusFix – Chitkara University" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `${otp} is your CampusFix verification code`,
    html: buildEmailHTML(name, otp, minutes),
    text: `Your CampusFix OTP is: ${otp}\n\nIt expires in ${minutes} minutes.\n\nDo not share this with anyone.\n\n– CampusFix, Chitkara University`,
  };

  await transporter.sendMail(mailOptions);
  return { success: true };
}

module.exports = { sendOTPEmail, verifyOTP, storeOTP };
