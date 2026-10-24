const express = require('express');
const router = express.Router();
const { getLeaves, createLeave, updateLeave, deleteLeave } = require('../controllers/leaveController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getLeaves)
  .post(protect, createLeave);

router.route('/:id')
  .patch(protect, updateLeave)
  .delete(protect, deleteLeave);

module.exports = router;
