const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/chatbotController');

// Public chatbot endpoint
router.post('/message', ctrl.chatMessage);

module.exports = router;
