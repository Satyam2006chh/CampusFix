const mongoose = require('mongoose');
const { JsonCollection } = require('../config/jsonDb');

const attendanceSchema = new mongoose.Schema(
  {
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date:        { type: String, required: true },       // "YYYY-MM-DD"
    clock_in:    { type: String },                       // "HH:MM"
    clock_out:   { type: String },
    working_hours: { type: Number, default: 0 },
    day_type:    { type: String, enum: ['Regular', 'Half Day', 'Holiday'], default: 'Regular' },
    status:      { type: String, enum: ['Present', 'Late', 'Absent', 'On Leave'], default: 'Present' },
    is_late:     { type: Boolean, default: false },
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
