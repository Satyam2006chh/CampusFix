const Department = require('../models/Department');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().lean();
    const result = departments.map((d) => ({ ...d, id: d._id }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Private
const getDepartment = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id).lean();
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json({ ...dept, id: dept._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create department
// @route   POST /api/departments
// @access  Admin
const createDepartment = async (req, res) => {
  try {
    const { name, description, category_tag } = req.body;
    if (!name || !category_tag) {
      return res.status(400).json({ message: 'Name and category_tag are required' });
    }

    const dept = await Department.create({ name, description, category_tag });
    res.status(201).json({ ...dept.toObject(), id: dept._id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Department name already exists' });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update department
// @route   PATCH /api/departments/:id
// @access  Admin
const updateDepartment = async (req, res) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json({ ...dept, id: dept._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Admin
const deleteDepartment = async (req, res) => {
  try {
    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
