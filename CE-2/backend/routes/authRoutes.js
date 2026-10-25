const express = require('express');
const router = express.Router();
const {
  login,
  register,
  logout,
  getMe,
  sendRegistrationOtp,
  verifyAndRegister
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/register', register);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// OTP-based student registration
router.post('/send-registration-otp', sendRegistrationOtp);
router.post('/verify-and-register', verifyAndRegister);

module.exports = router;
