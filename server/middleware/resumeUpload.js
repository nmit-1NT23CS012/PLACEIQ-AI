const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

const uploadDirectory = path.resolve(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    fs.mkdir(uploadDirectory, { recursive: true }, error => cb(error, uploadDirectory));
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user.id}-${Date.now()}-${crypto.randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (extension !== '.pdf' && extension !== '.docx') {
      return cb(new Error('Only PDF and DOCX are allowed'));
    }
    cb(null, true);
  }
});

module.exports = fieldName => (req, res, next) => {
  upload.single(fieldName)(req, res, error => {
    if (!error) return next();

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Resume files must be 10 MB or smaller.' });
    }
    if (error instanceof multer.MulterError || error.message === 'Only PDF and DOCX are allowed') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  });
};
