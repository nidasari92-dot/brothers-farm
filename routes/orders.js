const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/orderController');
const { authenticate, adminOnly } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id/status', adminOnly, ctrl.updateStatus);

module.exports = router;
