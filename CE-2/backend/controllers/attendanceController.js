const Attendance = require('../models/Attendance');

const norm = (a) => ({ ...a, id: a._id });

// GET /api/attendance  — supports ?employee_id=, ?date=
const getAttendance = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employee_id) filter.employee_id = req.query.employee_id;
    if (req.query.date)        filter.date        = req.query.date;
    if (req.query.department_id) filter.department_id = req.query.department_id;

    const records = await Attendance.find(filter).sort({ date: -1 }).lean();
    res.json(records.map(norm));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/attendance  — clock in
const createAttendance = async (req, res) => {
  try {
    const { employee_id, date, clock_in, day_type, status, is_late, department_id } = req.body;

    // Prevent duplicate clock-in on same day
    const existing = await Attendance.findOne({ employee_id, date });
    if (existing) return res.status(400).json({ message: 'Already clocked in for today' });

    const record = await Attendance.create({
      employee_id, date, clock_in, day_type: day_type || 'Regular',
      status: status || 'Present', is_late: is_late || false,
      department_id,
    });
    res.status(201).json(norm(record.toObject ? record.toObject() : record));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PATCH /api/attendance/:id  — clock out / update
const updateAttendance = async (req, res) => {
  try {
    const result = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const record = result && typeof result.lean === 'function' ? await result.lean() : result;
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(norm(record));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getAttendance, createAttendance, updateAttendance };
