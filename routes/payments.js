const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentController');
const { authenticate, adminOnly } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.post('/', adminOnly, ctrl.create);

module.exports = router;
