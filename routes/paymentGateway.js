const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentGatewayController');
const midtransCtrl = require('../controllers/midtransController');
const { authenticate, adminOnly } = require('../middleware/auth');

// Public webhook endpoints (no auth, but should use secret/token validation)
router.post('/webhook/xendit', ctrl.xenditWebhook);
router.post('/webhook/midtrans', ctrl.midtransWebhook);
router.post('/webhook/midtrans/v2', midtransCtrl.midtransWebhook);

// Customer-initiated payment
router.post('/create', authenticate, ctrl.createPayment);
router.post('/midtrans/create', authenticate, midtransCtrl.createTransaction);
router.get('/status/:paymentId', authenticate, ctrl.getPaymentStatus);
router.post('/simulate-success', authenticate, ctrl.simulateSuccess);

module.exports = router;
