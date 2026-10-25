const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employee_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date:          { type: String, required: true },
    clock_in:      { type: String },
    clock_out:     { type: String },
    clock_in_lat:  { type: Number },
    clock_in_lng:  { type: Number },
    clock_out_lat: { type: Number },
    clock_out_lng: { type: Number },
    working_hours: { type: Number, default: 0 },
    day_type:      { type: String, enum: ['Regular', 'Half Day', 'Holiday'], default: 'Regular' },
    // Present = on time | Late_1 = 9:00–9:30 | Late_2 = after 9:30
    // Early Departure = left campus during shift (detected by bg checks)
    status:         { type: String, enum: ['Present', 'Late', 'Late_1', 'Late_2', 'Early Departure', 'Absent', 'On Leave'], default: 'Present' },
    is_late:        { type: Boolean, default: false },
    department_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    off_campus_count: { type: Number, default: 0 },   // how many bg checks showed off-campus
    off_campus_times: { type: String, default: '' },  // comma-separated "HH:MM" timestamps
  },
  { timestamps: true }
);

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
