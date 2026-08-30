const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/supplierController');
const { authenticate, adminOnly } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.get('/:id/dashboard', ctrl.dashboard);
router.post('/', adminOnly, ctrl.create);
router.put('/:id', adminOnly, ctrl.update);
router.delete('/:id', adminOnly, ctrl.remove);

module.exports = router;
