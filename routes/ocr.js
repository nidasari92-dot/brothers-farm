const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ocrController');
const { authenticate, adminOnly } = require('../middleware/auth');

// Upload image for OCR processing
router.post('/ocr', authenticate, adminOnly, ctrl.upload.single('image'), ctrl.ocrImage);

// Confirm OCR results and update database
router.post('/ocr/confirm', authenticate, adminOnly, ctrl.confirmOcrUpdate);

module.exports = router;
