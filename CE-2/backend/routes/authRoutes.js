const express = require('express');
const router = express.Router();
const { login, register, logout, getMe, sendOtp, verifyOtp } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/register', register);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// ── OTP routes for student Google login ──────────────────────
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

module.exports = router;
