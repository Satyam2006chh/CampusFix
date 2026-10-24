const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

module.exports = { login, register, logout, getMe };
