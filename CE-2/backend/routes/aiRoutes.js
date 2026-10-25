const express = require('express');
const router = express.Router();
const { polishDescription, evaluateQuickFix, analyzeComplaint } = require('../controllers/aiController');

router.post('/polish', polishDescription);
router.post('/quick-fix', evaluateQuickFix);
router.post('/analyze', analyzeComplaint);

module.exports = router;
