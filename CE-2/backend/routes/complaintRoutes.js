const express = require('express');
const router = express.Router();
const {
  getComplaints,
  getComplaint,
  createComplaint,
  updateComplaint,
  deleteComplaint,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(protect, getComplaints)
  .post(protect, createComplaint);

router
  .route('/:id')
  .get(protect, getComplaint)
  .patch(protect, updateComplaint)
  .delete(protect, authorize('admin'), deleteComplaint);

module.exports = router;
