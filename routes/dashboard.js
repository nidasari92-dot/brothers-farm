const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const ctrl = require('../controllers/dashboardController');
const { authenticate, adminOnly, blockSensitiveFinancial } = require('../middleware/auth');

const uploadLogo = multer({
  dest: path.join(__dirname, '..', 'public', 'images'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(png|jpg|jpeg|webp)$/i.test(file.originalname);
    cb(ok ? null : new Error('Format gambar tidak didukung.'), ok);
  }
});

router.use(authenticate);
router.get('/summary', blockSensitiveFinancial, ctrl.summary);
router.get('/settings', ctrl.getSettings);
router.put('/settings', adminOnly, ctrl.updateSettings);
router.post('/settings/logo', adminOnly, uploadLogo.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File logo wajib diunggah.' });
  res.json({ path: '/images/' + req.file.filename });
});

module.exports = router;
