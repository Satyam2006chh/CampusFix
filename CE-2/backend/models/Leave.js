const mongoose = require('mongoose');

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

module.exports = mongoose.models.Leave || mongoose.model('Leave', leaveSchema);
