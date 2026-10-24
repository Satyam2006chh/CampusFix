const express = require('express');
const router = express.Router();
const { getPayslips, createPayslip, deletePayslip } = require('../controllers/payslipController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getPayslips)
  .post(protect, authorize('admin', 'dept_head'), createPayslip);

router.route('/:id')
  .delete(protect, authorize('admin', 'dept_head'), deletePayslip);

module.exports = router;
