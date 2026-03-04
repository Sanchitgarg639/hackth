const express = require('express');
const router = express.Router();
const researchController = require('../controllers/researchController');

router.post('/', researchController.runResearch);
router.get('/:companyId', researchController.getResearchFindings);

module.exports = router;
