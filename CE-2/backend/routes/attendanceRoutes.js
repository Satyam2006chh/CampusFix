const express = require('express');
const router = express.Router();
const { getAttendance, createAttendance, updateAttendance } = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getAttendance)
  .post(protect, createAttendance);

router.route('/:id')
  .patch(protect, updateAttendance);

module.exports = router;
