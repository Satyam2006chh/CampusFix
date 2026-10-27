const https = require('https');

/* ─────────────────────────────────────────────────────────────────
   CampusFix OTP Service — Twilio Verify (SMS)
   Works on Render free tier — pure HTTPS port 443, no SMTP
   ───────────────────────────────────────────────────────────────── */

// ── In-memory OTP store (keyed by phone number) ─────────────────
const otpStore = new Map();

// ── Store pending verification (phone → { purpose, expiresAt }) ─
function storePending(phone, purpose = 'registration') {
  const minutes = parseInt(process.env.OTP_EXPIRE_MINUTES || '10', 10);
  otpStore.set(phone, {
    purpose,
    expiresAt: Date.now() + minutes * 60 * 1000,
  });
}

function clearPending(phone) {
  otpStore.delete(phone);
}

// ── Twilio HTTPS helper ──────────────────────────────────────────
function twilioRequest(path, data) {
  const auth = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString('base64');

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'verify.twilio.com',
        path,
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.message || `Twilio error ${res.statusCode}`));
            }
          } catch {
            reject(new Error(`Invalid response: ${body}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Send OTP via Twilio Verify SMS ───────────────────────────────
async function sendOTPSms(phone, purpose = 'registration') {
  // Normalise to E.164 India format
  const e164 = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;

  const data = `To=${encodeURIComponent(e164)}&Channel=sms`;
  const path = `/v2/Services/${process.env.TWILIO_VERIFY_SID}/Verifications`;

  await twilioRequest(path, data);
  storePending(e164, purpose);

  console.log(`✅ OTP SMS sent via Twilio to ${e164}`);
  return { phone: e164 };
}

// ── Verify OTP entered by user ───────────────────────────────────
async function verifyOTPSms(phone, code) {
  const e164 = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;

  const data =
    `To=${encodeURIComponent(e164)}&Code=${encodeURIComponent(code.toString().trim())}`;
  const path = `/v2/Services/${process.env.TWILIO_VERIFY_SID}/VerificationCheck`;

  try {
    const result = await twilioRequest(path, data);
    if (result.status === 'approved') {
      clearPending(e164);
      return { valid: true };
    }
    return { valid: false, reason: 'Incorrect or expired code. Please try again.' };
  } catch (err) {
    return { valid: false, reason: err.message || 'Verification failed.' };
  }
}

module.exports = {
  sendOTPSms,
  verifyOTPSms,
};
