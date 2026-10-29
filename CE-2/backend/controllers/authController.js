const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendOTPSms, verifyOTPSms } = require('../services/otpService');

const CHITKARA_DOMAIN = 'chitkara.edu.in';

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// @desc    Login
// @route   POST /api/auth/login
const login = async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role)
    return res.status(400).json({ message: 'Please provide email, password and role' });

  try {
    const user = await User.findOne({ email: email.toLowerCase(), role }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    if (user.is_active === 0)
      return res.status(401).json({ message: 'Account disabled by Admin' });

    const token = generateToken(user._id || user.id);
    res.json({
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        designation: user.designation,
        phone: user.phone,
        is_active: user.is_active,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Send registration OTP via SMS to phone number
// @route   POST /api/auth/send-registration-otp
const sendRegistrationOtp = async (req, res) => {
  const { phone, email, name } = req.body;

  if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required.' });
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

  const emailLower = email.toLowerCase().trim();
  if (!emailLower.endsWith(`@${CHITKARA_DOMAIN}`)) {
    return res.status(403).json({
      success: false,
      message: 'Only official Chitkara University email IDs are permitted.',
    });
  }

  try {
    const existing = await User.findOne({ email: emailLower });
    if (existing)
      return res.status(400).json({ success: false, message: 'Email already registered. Please sign in.' });

    const existingPhone = await User.findOne({ phone: phone.replace(/\D/g, '') });
    if (existingPhone)
      return res.status(400).json({ success: false, message: 'This phone number is already registered with another account.' });

    await sendOTPSms(phone, 'registration');
    res.json({ success: true, message: `Verification code sent to +91${phone.replace(/\D/g, '')}.` });
  } catch (err) {
    console.error('sendRegistrationOtp error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
};

// @desc    Verify SMS OTP and create student account
// @route   POST /api/auth/verify-and-register
const verifyAndRegister = async (req, res) => {
  const { name, email, password, roll_no, phone, otp } = req.body;

  if (!name || !email || !password || !phone || !otp)
    return res.status(400).json({ success: false, message: 'All fields including phone and OTP are required.' });

  const emailLower = email.toLowerCase().trim();
  if (!emailLower.endsWith(`@${CHITKARA_DOMAIN}`)) {
    return res.status(403).json({ success: false, message: 'Only Chitkara University emails are permitted.' });
  }

  const result = await verifyOTPSms(phone, otp);
  if (!result.valid)
    return res.status(400).json({ success: false, message: result.reason });

  try {
    const existing = await User.findOne({ email: emailLower });
    if (existing)
      return res.status(400).json({ success: false, message: 'Email already registered.' });

    const user = await User.create({
      name,
      email: emailLower,
      password,
      roll_no: roll_no || '',
      phone: phone.replace(/\D/g, ''),
      role: 'student',
      is_active: 1,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please sign in.',
      user: { id: user._id || user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Email already registered.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Send password reset OTP via SMS
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required.' });

  try {
    const user = await User.findOne({ phone: phone.replace(/\D/g, '') });
    if (!user)
      return res.status(404).json({ success: false, message: 'No account found with this phone number.' });

    await sendOTPSms(phone, 'password_reset');
    res.json({ success: true, message: 'Password reset code sent to your phone.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send reset code.' });
  }
};

// @desc    Verify reset OTP
// @route   POST /api/auth/verify-reset-otp
const verifyResetOtp = async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and code are required.' });

  const result = await verifyOTPSms(phone, otp);
  if (!result.valid) return res.status(400).json({ success: false, message: result.reason });

  res.json({ success: true, message: 'Code verified. You may now set a new password.' });
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  const { phone, newPassword } = req.body;
  if (!phone || !newPassword)
    return res.status(400).json({ success: false, message: 'Phone and new password are required.' });

  try {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    const updated = await User.findOneAndUpdate(
      { phone: phone.replace(/\D/g, '') },
      { password: hashed },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'Password reset successfully. Please sign in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Logout
const logout = (req, res) => res.json({ message: 'Logged out successfully' });

// @desc    Get current user
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('department_id', 'name category_tag');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Register (direct — kept for compatibility)
const register = async (req, res) => {
  const { name, email, password, roll_no, phone } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'Please provide name, email and password' });

  const emailLower = email.toLowerCase().trim();
  if (!emailLower.endsWith(`@${CHITKARA_DOMAIN}`))
    return res.status(403).json({ message: 'Only official Chitkara email is permitted.', code: 'DOMAIN_BLOCKED' });

  try {
    const existing = await User.findOne({ email: emailLower });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email: emailLower, password, roll_no, phone, role: 'student', is_active: 1 });
    const token = generateToken(user._id || user.id);
    res.status(201).json({ token, user: { id: user._id || user.id, name: user.name, email: user.email, role: user.role, is_active: user.is_active } });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Email already registered' });
    res.status(500).json({ message: err.message });
  }
};

module.exports = { login, register, logout, getMe, sendRegistrationOtp, verifyAndRegister, forgotPassword, verifyResetOtp, resetPassword };
