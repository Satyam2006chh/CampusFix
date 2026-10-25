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

    const token = generateToken(user._id || user.id);

    // Build the user object to return
    const userData = {
      id: user._id || user.id,
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

// @desc    Send Registration OTP to college email
// @route   POST /api/auth/send-registration-otp
// @access  Public
const sendRegistrationOtp = async (req, res) => {
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  const emailLower = email.toLowerCase().trim();

  // Internal domain check: only college domain permitted
  if (!emailLower.endsWith(`@${CHITKARA_DOMAIN}`)) {
    return res.status(403).json({
      success: false,
      code: 'DOMAIN_BLOCKED',
      message: 'Only official college email ID is permitted for accessing this application.'
    });
  }

  try {
    const existing = await User.findOne({ email: emailLower });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered. Please sign in instead.'
      });
    }

    await sendOTPEmail(emailLower, name || 'Student');
    res.json({
      success: true,
      message: `Verification code sent to ${emailLower}. Check your inbox.`
    });
  } catch (err) {
    console.error('OTP email error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
  }
};

// @desc    Verify OTP and register student account
// @route   POST /api/auth/verify-and-register
// @access  Public
const verifyAndRegister = async (req, res) => {
  const { name, email, password, roll_no, phone, otp } = req.body;

  if (!name || !email || !password || !otp) {
    return res.status(400).json({ success: false, message: 'Please provide all required fields and the verification code.' });
  }

  const emailLower = email.toLowerCase().trim();

  // Internal domain check
  if (!emailLower.endsWith(`@${CHITKARA_DOMAIN}`)) {
    return res.status(403).json({
      success: false,
      code: 'DOMAIN_BLOCKED',
      message: 'Only official college email ID is permitted for accessing this application.'
    });
  }

  // Verify OTP
  const result = verifyOTP(emailLower, otp);
  if (!result.valid) {
    return res.status(400).json({ success: false, message: result.reason });
  }

  try {
    const existing = await User.findOne({ email: emailLower });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered. Please sign in.' });
    }

    const user = await User.create({
      name,
      email: emailLower,
      password,
      roll_no: roll_no || '',
      phone: phone || '',
      role: 'student',
      is_active: 1,
    });

    res.status(201).json({
      success: true,
      message: 'Account verified and created successfully! Please sign in to continue.',
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Register student (fallback direct registration)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const { name, email, password, roll_no, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email and password' });
  }

  const emailLower = email.toLowerCase().trim();
  if (!emailLower.endsWith(`@${CHITKARA_DOMAIN}`)) {
    return res.status(403).json({
      message: 'Only official college email ID is permitted for accessing this application.',
      code: 'DOMAIN_BLOCKED'
    });
  }

  try {
    const existing = await User.findOne({ email: emailLower });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email: emailLower,
      password,
      roll_no,
      phone,
      role: 'student',
      is_active: 1,
    });

    const token = generateToken(user._id || user.id);

    const userData = {
      id: user._id || user.id,
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

module.exports = {
  login,
  register,
  logout,
  getMe,
  sendRegistrationOtp,
  verifyAndRegister
};
