const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/backupController');
const { authenticate, adminOnly } = require('../middleware/auth');

console.log('Loading backup routes');

// Admin backup/restore
router.get('/', authenticate, adminOnly, ctrl.listBackups);
router.post('/', authenticate, adminOnly, ctrl.createBackup);
router.post('/restore', authenticate, adminOnly, ctrl.restoreBackup);
router.delete('/:filename', authenticate, adminOnly, ctrl.deleteBackup);
router.get('/:filename/download', authenticate, adminOnly, ctrl.downloadBackup);

console.log('Backup routes registered');

module.exports = router;
