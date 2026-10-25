const Complaint = require('../models/Complaint');
const Location = require('../models/Location');
const User = require('../models/User');

// Helper: normalize complaint for frontend (id, created_at compatible)
const normalize = (c) => ({
  ...c,
  id: c._id,
  created_at: c.createdAt,
});

// @desc    Get complaints (with optional filters)
// @route   GET /api/complaints
// @access  Private
const getComplaints = async (req, res) => {
  try {
    const filter = {};

    // Support query params used by CE-1 frontend
    if (req.query.user_id) filter.user_id = req.query.user_id;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.source) filter.source = req.query.source;

    // Duplicate-check query: location_id + category
    if (req.query.location_id) filter.location_id = req.query.location_id;
    if (req.query.category) filter.category = req.query.category;

    const complaints = await Complaint.find(filter).sort({ createdAt: -1 }).lean();
    res.json(complaints.map(normalize));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get single complaint
// @route   GET /api/complaints/:id
// @access  Private
const getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).lean();
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json(normalize(complaint));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create complaint
// @route   POST /api/complaints
// @access  Student
const createComplaint = async (req, res) => {
  try {
    const {
      title,
      category,
      location_id,
      location_desc,
      urgency,
      description,
      user_id,
      user_name,
      upvote_count,
      source,
      original_complaint_id,
    } = req.body;

    if (!title || !category || !location_id || !description) {
      return res.status(400).json({ message: 'title, category, location_id and description are required' });
    }

    const complaint = await Complaint.create({
      title,
      category,
      location_id,
      location_desc,
      urgency: urgency || 'Medium',
      description,
      user_id: user_id || req.user._id,
      user_name: user_name || req.user.name,
      status: 'Pending',
      upvote_count: upvote_count || 0,
      source: source || 'original',
      original_complaint_id: original_complaint_id || null,
    });

    res.status(201).json(normalize(complaint.toObject()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update complaint (partial)
// @route   PATCH /api/complaints/:id
// @access  Private
const updateComplaint = async (req, res) => {
  try {
    const result = await Complaint.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // JSON DB returns a plain object; Mongoose returns a Mongoose doc — normalise both
    const complaint = result && typeof result.lean === 'function'
      ? await result.lean()
      : result;

    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json(normalize(complaint));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete complaint
// @route   DELETE /api/complaints/:id
// @access  Admin
const deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json({ message: 'Complaint deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getComplaints,
  getComplaint,
  createComplaint,
  updateComplaint,
  deleteComplaint,
};
