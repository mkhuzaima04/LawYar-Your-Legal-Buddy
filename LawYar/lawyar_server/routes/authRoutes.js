const express = require('express');
const router = express.Router();
// Import the functions from your controller
const { registerUser, loginUser } = require('../controllers/authController');

// --- AUTH ROUTES ---

// This maps to: POST http://127.0.0.1:5000/api/auth/register
router.post('/register', registerUser);

// This maps to: POST http://127.0.0.1:5000/api/auth/login
router.post('/login', loginUser);

module.exports = router;