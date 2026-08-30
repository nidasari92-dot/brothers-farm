const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoiceController');
const { authenticate, adminOnly } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.get('/:id/preview', ctrl.getPreview);
router.get('/:id/pdf', ctrl.generatePdf);
router.get('/:id/excel', ctrl.generateExcel);
router.post('/', adminOnly, ctrl.create);
router.put('/:id', adminOnly, ctrl.update);

module.exports = router;
