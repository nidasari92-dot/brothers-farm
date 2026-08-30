const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { authenticate, adminOnly } = require('../middleware/auth');

router.post('/login', ctrl.login);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.post('/users', authenticate, adminOnly, ctrl.createUser);
router.get('/users', authenticate, adminOnly, ctrl.listUsers);
router.put('/users/:id/password', authenticate, adminOnly, ctrl.resetUserPassword);

module.exports = router;
