const express = require('express');
const router = express.Router();
const { uploadDocument } = require('../controllers/uploadController');
const { upload } = require('../middlewares/fileUpload');

router.post('/', upload.single('file'), uploadDocument);

module.exports = router;
