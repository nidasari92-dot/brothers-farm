const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/customerPortalController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.get('/orders', ctrl.myOrders);
router.get('/orders/:id', ctrl.myOrderDetail);
router.post('/orders', ctrl.createOrder);
router.get('/payments', ctrl.myPayments);
router.get('/invoices', ctrl.myInvoices);
router.get('/prices', ctrl.latestPrices);

// Payment gateway endpoints
router.post('/pay', ctrl.createPayment);
router.get('/pay/status/:paymentId', ctrl.getPaymentStatus);
router.post('/pay/simulate/:paymentId', ctrl.simulatePayment);

module.exports = router;
