const router = require('express').Router();
const { createOnboarding } = require('../controllers/onboardController');

router.post('/', createOnboarding);

module.exports = router;
