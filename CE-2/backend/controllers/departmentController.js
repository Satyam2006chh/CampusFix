const Department = require('../models/Department');

const safeLean = async (result) => {
  if (!result) return null;
  return typeof result.lean === 'function' ? await result.lean() : result;
};

// @desc    Get all departments
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().lean();
    res.json(departments.map((d) => ({ ...d, id: d._id || d.id })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc    Get single department
const getDepartment = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id).lean();
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json({ ...dept, id: dept._id || dept.id });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc    Create department
const createDepartment = async (req, res) => {
  try {
    const { name, description, category_tag } = req.body;
    if (!name || !category_tag) return res.status(400).json({ message: 'Name and category_tag are required' });
    const dept = await Department.create({ name, description, category_tag });
    const obj = dept.toObject ? dept.toObject() : dept;
    res.status(201).json({ ...obj, id: obj._id || obj.id });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Department name already exists' });
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update department
const updateDepartment = async (req, res) => {
  try {
    const result = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    const dept = await safeLean(result);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json({ ...dept, id: dept._id || dept.id });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc    Delete department
const deleteDepartment = async (req, res) => {
  try {
    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Department deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment };
