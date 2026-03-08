const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed file types
const ALLOWED_EXTENSIONS = ['.pdf', '.csv', '.xlsx', '.json'];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

// Sanitize filename: strip path traversal and special chars
const sanitizeFilename = (name) => {
	return name
		.replace(/[^a-zA-Z0-9._-]/g, '_')
		.replace(/\.{2,}/g, '.')
		.substring(0, 200);
};

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadDir);
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		const safeName = sanitizeFilename(file.originalname);
		cb(null, uniqueSuffix + '-' + safeName);
	}
});

const fileFilter = (req, file, cb) => {
	const ext = path.extname(file.originalname).toLowerCase();
	if (ALLOWED_EXTENSIONS.includes(ext)) {
		cb(null, true);
	} else {
		cb(new Error(`File type ${ext} not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
	}
};

const upload = multer({
	storage,
	fileFilter,
	limits: { fileSize: MAX_SIZE }
});

module.exports = { upload };
