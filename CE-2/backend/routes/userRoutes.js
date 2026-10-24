const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(protect, authorize('admin', 'dept_head'), getUsers)
  .post(protect, authorize('admin', 'dept_head'), createUser);

router
  .route('/:id')
  .get(protect, authorize('admin', 'dept_head'), getUser)
  .patch(protect, authorize('admin', 'dept_head'), updateUser)
  .delete(protect, authorize('admin', 'dept_head'), deleteUser);

module.exports = router;
