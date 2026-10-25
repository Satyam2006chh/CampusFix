const Attendance = require('../models/Attendance');

const norm = (a) => ({ ...a, id: a._id });

// GET /api/attendance  — supports ?employee_id=, ?date=, ?department_id=, ?role=
const getAttendance = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employee_id) filter.employee_id = req.query.employee_id;
    if (req.query.date)        filter.date        = req.query.date;
    if (req.query.department_id) filter.department_id = req.query.department_id;

    let query = Attendance.find(filter)
      .populate('employee_id', 'name email role department_id designation phone')
      .populate('department_id', 'name')
      .sort({ date: -1, createdAt: -1 });

    let records = await query.lean();

    if (req.query.role) {
      records = records.filter(r => r.employee_id && r.employee_id.role === req.query.role);
    }

    res.json(records.map(norm));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/attendance  — clock in
const createAttendance = async (req, res) => {
  try {
    const {
      employee_id, date, clock_in, day_type, status, is_late,
      department_id, clock_in_lat, clock_in_lng
    } = req.body;

    // Prevent duplicate clock-in on same day
    const existing = await Attendance.findOne({ employee_id, date });
    if (existing) return res.status(400).json({ message: 'Already clocked in for today' });

    const payload = {
      employee_id,
      date,
      clock_in,
      day_type: day_type || 'Regular',
      status: status || 'Present',
      is_late: is_late || false,
      clock_in_lat: clock_in_lat !== undefined ? Number(clock_in_lat) : undefined,
      clock_in_lng: clock_in_lng !== undefined ? Number(clock_in_lng) : undefined,
    };

    if (department_id && department_id.trim() !== '') {
      payload.department_id = department_id;
    }

    const record = await Attendance.create(payload);
    res.status(201).json(norm(record.toObject()));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PATCH /api/attendance/:id  — clock out / update
const updateAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(norm(record));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getAttendance, createAttendance, updateAttendance };
