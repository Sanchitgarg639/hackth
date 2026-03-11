const router = require('express').Router();
const { getPipelineStatus } = require('../controllers/pipelineStatusController');

router.get('/:analysisId', getPipelineStatus);

module.exports = router;
