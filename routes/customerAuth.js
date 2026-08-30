const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/customerAuthController');

// Public: customer registration
router.post('/register', ctrl.register);

// Public: customer login (reuse same logic as admin/user)
router.post('/login', ctrl.login);

// Protected: get current customer profile
router.get('/me', require('../middleware/auth').authenticate, ctrl.me);

module.exports = router;
