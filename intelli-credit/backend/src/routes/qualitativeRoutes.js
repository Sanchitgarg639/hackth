const express = require('express');
const router = express.Router();
const qualitativeController = require('../controllers/qualitativeController');

router.post('/', qualitativeController.storeQualitativeInput);
router.get('/:companyId', qualitativeController.getQualitativeInput);

module.exports = router;
