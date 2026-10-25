const express = require('express');
const router = express.Router();
const { polishDescription, evaluateQuickFix } = require('../controllers/aiController');

router.post('/polish', polishDescription);
router.post('/quick-fix', evaluateQuickFix);

module.exports = router;
