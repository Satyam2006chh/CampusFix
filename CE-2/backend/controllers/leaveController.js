const Leave = require('../models/Leave');

const norm = (l) => ({ ...l, id: l._id });

// GET /api/leaves  — ?employee_id=, ?department_id=, ?status=, ?role=
const getLeaves = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employee_id)   filter.employee_id   = req.query.employee_id;
    if (req.query.department_id) filter.department_id = req.query.department_id;
    if (req.query.status)        filter.status        = req.query.status;

    let query = Leave.find(filter)
      .populate('employee_id', 'name email role department_id designation phone')
      .populate('department_id', 'name')
      .sort({ createdAt: -1 });

    let leaves = await query.lean();

    if (req.query.role) {
      leaves = leaves.filter(l => l.employee_id && l.employee_id.role === req.query.role);
    }

    res.json(leaves.map(norm));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/leaves  — employee applies for leave
const createLeave = async (req, res) => {
  try {
    const { employee_id, employee_name, department_id, leave_type, from_date, to_date, reason } = req.body;
    if (!employee_id || !department_id || !leave_type || !from_date || !to_date || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const leave = await Leave.create({
      employee_id, employee_name, department_id,
      leave_type, from_date, to_date, reason, status: 'Pending',
    });
    res.status(201).json(norm(leave.toObject()));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PATCH /api/leaves/:id  — dept head or admin approves/rejects
const updateLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('employee_id', 'name email role department_id designation phone')
      .populate('department_id', 'name')
      .lean();
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.json(norm(leave));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/leaves/:id
const deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndDelete(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.json({ message: 'Leave deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getLeaves, createLeave, updateLeave, deleteLeave };
