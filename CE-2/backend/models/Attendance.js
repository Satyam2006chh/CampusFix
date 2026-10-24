const mongoose = require('mongoose');
const { JsonCollection } = require('../config/jsonDb');

const attendanceSchema = new mongoose.Schema(
  {
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date:        { type: String, required: true },       // "YYYY-MM-DD"
    clock_in:    { type: String },                       // "HH:MM"
    clock_out:   { type: String },
    clock_in_lat:  { type: Number },
    clock_in_lng:  { type: Number },
    clock_out_lat: { type: Number },
    clock_out_lng: { type: Number },
    working_hours: { type: Number, default: 0 },
    day_type:    { type: String, enum: ['Regular', 'Half Day', 'Holiday'], default: 'Regular' },
    // Present = on time, Late_1 = 9:00–9:30, Late_2 = after 9:30, Absent/On Leave
    status:      { type: String, enum: ['Present', 'Late', 'Late_1', 'Late_2', 'Absent', 'On Leave'], default: 'Present' },
    is_late:     { type: Boolean, default: false },
    department_id: { type: String },
  },
  { timestamps: true }
);

const MongoAttModel = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
const jsonAtt = new JsonCollection('attendance');

const AttProxy = new Proxy(MongoAttModel, {
  get(target, prop) {
    if (process.env.USE_JSON_DB === 'true') {
      if (typeof jsonAtt[prop] === 'function') return jsonAtt[prop].bind(jsonAtt);
      return jsonAtt[prop];
    }
    return target[prop];
  },
});

module.exports = AttProxy;
