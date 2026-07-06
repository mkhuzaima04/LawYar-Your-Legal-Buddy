require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// --- 1. GLOBAL MIDDLEWARE ---
// Allows your React app (on port 5173) to communicate with this server (on port 5000)
app.use(cors()); 

/**
 * URDU ENCODING FIX:
 * We increase the limit to 50mb to handle long legal texts and voice transcriptions.
 * We also ensure the server is ready for complex Unicode characters (Urdu script).
 */
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/**
 * UTF-8 HEADER MIDDLEWARE:
 * This forces every response from the server to use UTF-8 encoding,
 * ensuring Urdu text renders correctly in the browser.
 */
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// --- 2. DATABASE CONNECTION ---
// Using 127.0.0.1 instead of localhost for better Windows stability
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lawyar";

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Locally'))
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1); // Stop server if DB is not running
  });

// --- 3. ROUTES ---
// Basic check to see if server is alive
app.get('/', (req, res) => {
  res.json({ message: "LawYar Local Server is Online." });
});

// Authentication (Signup/Login)
// Make sure you have a file at: ./routes/authRoutes.js
app.use('/api/auth', require('./routes/authRoutes'));

// Legislation Data
app.use('/api/laws', require('./routes/lawRoutes'));

// AI Chatbot
app.use('/api/chat', require('./routes/chatRoutes'));

// --- 4. START SERVER ---
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
  console.log(`👉 Register Endpoint: http://127.0.0.1:${PORT}/api/auth/register`);
  console.log(`👉 Urdu Support: UTF-8 Encoding Enabled`);
});