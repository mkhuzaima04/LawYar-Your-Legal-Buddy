const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// 1. Route for sending messages
router.post('/', chatController.processChatMessage);

// 2. Route for history
// ⚠️ NO IF STATEMENT. Just mount the route directly.
router.post('/history', chatController.getChatHistory);

module.exports = router;