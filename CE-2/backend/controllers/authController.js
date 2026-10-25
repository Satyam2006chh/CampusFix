const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOTPEmail, verifyOTP } = require('../services/otpService');

const CHITKARA_DOMAIN = 'chitkara.edu.in';

// Helper: generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Please provide email, password and role' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase(), role }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.is_active === 0) {
      return res.status(401).json({ message: 'Account disabled by Admin' });
    }

    const token = generateToken(user._id);

    // Build the user object to return (matching CE-1 shape)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department_id: user.department_id,
      is_active: user.is_active,
    };

    res.json({ token, user: userData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Register student
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const { name, email, password, roll_no, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email and password' });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      roll_no,
      phone,
      role: 'student',
      is_active: 1,
    });

    const token = generateToken(user._id);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    };

    res.status(201).json({ token, user: userData });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc    Logout (client-side, just acknowledge)
// @route   POST /api/auth/logout
// @access  Private
const logout = (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('department_id', 'name category_tag');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Send OTP to student's Chitkara email
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = async (req, res) => {
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  // ── Chitkara domain check ───────────────────────────
  const emailLower = email.toLowerCase();
  if (!emailLower.endsWith(`@${CHITKARA_DOMAIN}`)) {
    return res.status(403).json({
      message: 'Access restricted to Chitkara University students only. Please use your @chitkara.edu.in email address.',
      code: 'DOMAIN_BLOCKED'
    });
  }

  try {
    await sendOTPEmail(emailLower, name || 'Student');
    res.json({
      success: true,
      message: `OTP sent successfully to ${emailLower}. Check your inbox.`,
    });
  } catch (err) {
    console.error('OTP email error:', err.message);
    res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
  }
};

// @desc    Verify OTP and return session token
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  const { email, otp, name, googleUid } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  const emailLower = email.toLowerCase();

  // ── Verify OTP ────────────────────────────────
  const result = verifyOTP(emailLower, otp);
  if (!result.valid) {
    return res.status(401).json({ message: result.reason });
  }

  try {
    // ── Find or auto-create student in db ──────────────
    let user = await User.findOne({ email: emailLower });

    if (!user) {
      // First-time Google login → create student account automatically
      const displayName = name || emailLower.split('@')[0];
      user = await User.create({
        name: displayName,
        email: emailLower,
        password: `GOOGLE_${googleUid || Date.now()}`,  // placeholder; no password login
        role: 'student',
        is_active: 1,
      });
    }

    if (user.is_active === 0) {
      return res.status(401).json({ message: 'Your account has been disabled. Contact admin.' });
    }

    const token = generateToken(user._id || user.id);

    const userData = {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'student',
      is_active: user.is_active,
    };

    res.json({ token, user: userData });
  } catch (err) {
    console.error('verifyOtp error:', err.message);
    res.status(500).json({ message: 'Server error during verification.' });
  }
};

module.exports = { login, register, logout, getMe, sendOtp, verifyOtp };
