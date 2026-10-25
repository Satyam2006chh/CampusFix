const express = require('express');
const router = express.Router();
const { polishDescription, evaluateQuickFix, analyzeComplaint } = require('../controllers/aiController');
const {
  generateDailyBrief,
  askCopilot,
  auditComplaintTriage,
  escalateComplaint,
  getInfrastructureRisks,
  evaluateLeaveStaffing,
  auditAttendanceAnomalies,
  auditPayrollAnomalies
} = require('../controllers/adminAiController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Student AI endpoints
router.post('/polish', polishDescription);
router.post('/quick-fix', evaluateQuickFix);
router.post('/analyze', analyzeComplaint);

// ── Admin AI Endpoints ────────────────────────────────────────
// Module 1: Executive Summary & Copilot
router.post('/admin/daily-brief', protect, authorize('admin'), generateDailyBrief);
router.post('/admin/copilot-query', protect, authorize('admin'), askCopilot);

// Module 2: Safety Triage & Predictive Maintenance
router.get('/admin/triage-audit', protect, authorize('admin'), auditComplaintTriage);
router.post('/admin/escalate-complaint', protect, authorize('admin'), escalateComplaint);
router.get('/admin/infrastructure-risks', protect, authorize('admin'), getInfrastructureRisks);

// Module 3: Workforce Intelligence, Attendance & Payroll Auditor
router.post('/admin/leave-advisor', protect, authorize('admin'), evaluateLeaveStaffing);
router.get('/admin/attendance-audit', protect, authorize('admin'), auditAttendanceAnomalies);
router.get('/admin/payroll-audit', protect, authorize('admin'), auditPayrollAnomalies);

module.exports = router;
