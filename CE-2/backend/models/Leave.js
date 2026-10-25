const mongoose = require('mongoose');
const { JsonCollection } = require('../config/jsonDb');

const leaveSchema = new mongoose.Schema(
  {
    employee_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employee_name: { type: String },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    leave_type:    { type: String, enum: ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Emergency Leave'], required: true },
    from_date:     { type: String, required: true },     // "YYYY-MM-DD"
    to_date:       { type: String, required: true },
    reason:        { type: String, required: true },
    status:        { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    reviewed_by:   { type: String },
    reviewed_at:   { type: String },
  },
  { timestamps: true }
);

const MongoLeaveModel = mongoose.models.Leave || mongoose.model('Leave', leaveSchema);
const jsonLeaves = new JsonCollection('leaves');

const LeaveProxy = new Proxy(MongoLeaveModel, {
  get(target, prop) {
    if (process.env.USE_JSON_DB === 'true') {
      if (typeof jsonLeaves[prop] === 'function') return jsonLeaves[prop].bind(jsonLeaves);
      return jsonLeaves[prop];
    }
    return target[prop];
  },
});

module.exports = LeaveProxy;
