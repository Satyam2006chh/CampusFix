const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    location_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: [true, 'Location is required'],
    },
    location_desc: {
      type: String,
    },
    urgency: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    user_name: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        'Pending',
        'In Progress',
        'Waiting Confirmation',
        'Closed',
        'Reopened',
        'Overdue',
      ],
      default: 'Pending',
    },
    upvote_count: {
      type: Number,
      default: 0,
    },
    assigned_to_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assigned_to_name: {
      type: String,
    },
    deadline: {
      type: String, // kept as date string "YYYY-MM-DD" for FE compatibility
    },
    reopen_reason: {
      type: String,
    },
    source: {
      type: String,
      enum: ['original', 'upvoted'],
      default: 'original',
    },
    original_complaint_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);
