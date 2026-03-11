const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { classifyDocument } = require('../controllers/classifyController');

const upload = multer({
	dest: path.join(__dirname, '../../uploads'),
	limits: { fileSize: 25 * 1024 * 1024 },
});

router.post('/', upload.array('files', 1), classifyDocument);

module.exports = router;
