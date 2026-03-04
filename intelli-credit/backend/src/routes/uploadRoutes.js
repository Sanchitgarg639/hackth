const express = require('express');
const router = express.Router();
const { uploadDocument, getUploadById } = require('../controllers/uploadController');
const { upload } = require('../middlewares/fileUpload');

// POST /api/v1/upload — Upload a document
router.post('/', upload.array('files', 5), uploadDocument);

// GET /api/v1/upload/:id — Get file metadata
router.get('/:id', getUploadById);

module.exports = router;
