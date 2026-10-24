const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get all users (with optional role filter)
// @route   GET /api/users
// @access  Admin
const getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter).populate('department_id', 'name category_tag').lean();

    // Normalize _id to id for FE compatibility
    const result = users.map((u) => ({ ...u, id: u._id }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Admin
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('department_id', 'name category_tag').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ ...user, id: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create user (dept_head / employee by admin or dept_head)
// @route   POST /api/users
// @access  Admin, Dept Head
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, department_id, designation, phone, availability } =
      req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password and role are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({
      name,
      email,
      password,
      role,
      department_id: department_id || null,
      designation,
      phone,
      availability: availability || 'Available',
      is_active: 1,
    });

    res.status(201).json({ ...user.toObject(), id: user._id });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Email already registered' });
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update user (partial)
// @route   PATCH /api/users/:id
// @access  Admin, Dept Head (for their employees)
const updateUser = async (req, res) => {
  try {
    const { password, ...updates } = req.body;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    const result = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    // JSON DB returns plain object; Mongoose returns a doc — handle both
    const user = result && typeof result.lean === 'function'
      ? await result.lean()
      : result;

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ ...user, id: user._id || user.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Admin, Dept Head
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User removed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser };
