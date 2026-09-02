const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const ctrl = require('../controllers/priceController');
const { authenticate, adminOnly } = require('../middleware/auth');

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads', 'excel'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : new Error('Hanya file .xlsx / .xls yang diizinkan.'), ok);
  }
});

router.use(authenticate);
router.get('/', ctrl.list);
router.post('/', adminOnly, ctrl.create);
router.put('/:id', adminOnly, ctrl.update);
router.delete('/:id', adminOnly, ctrl.remove);
router.post('/upload', adminOnly, upload.single('file'), ctrl.uploadExcel);

module.exports = router;
