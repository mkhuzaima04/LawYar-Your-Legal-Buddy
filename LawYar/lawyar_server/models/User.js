const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true, // No two users can have the same email
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  // We add timestamps to automatically record when the account was created
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);