const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true 
  },
  title: { //  ADD THIS RIGHT HERE
    type: String,
    trim: true,
    default: "New Legal Query"
  },
  messages: [
    {
      sender: { type: String, enum: ['user', 'bot'], required: true },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);