const Chat = require('../models/Chat');
const mongoose = require('mongoose');
const axios = require('axios');

exports.processChatMessage = async (req, res) => {
  try {
    const { message, userId, chatId, language, history } = req.body;
    const isGuest = userId === "GUEST" || !mongoose.Types.ObjectId.isValid(userId);

    // 1. Call Python AI Engine forwarding contextual turn matrices
    const pythonResponse = await axios.post('http://127.0.0.1:8000/api/chat', {
      query: message,
      history: history || [], // 🔹 SECURE RE-ROUTING TRANSIT OF MEMORY ARRAY
      language: language || 'English',
      top_k: 5
    });

    const aiAnswer = pythonResponse.data.answer;
    let finalChatId = chatId;

    // 2. Conditional Storage for Registered Users
    if (!isGuest) {
      const newMessagePair = [
        { sender: 'user', text: message },
        { sender: 'bot', text: aiAnswer }
      ];

      // A. If an existing chatId is provided, APPEND to it
      if (chatId && mongoose.Types.ObjectId.isValid(chatId)) {
        await Chat.findByIdAndUpdate(
          chatId,
          { $push: { messages: { $each: newMessagePair } } }
        );
      } 
      // B. If NO chatId is provided, CREATE a new session
      else {
        const generatedTitle = message.length > 25 ? message.substring(0, 25) + "..." : message;

        const newChatSession = new Chat({
          user: userId,
          title: generatedTitle, 
          messages: newMessagePair
        });

        const savedChat = await newChatSession.save();
        finalChatId = savedChat._id; 
      }
    }

    // 3. Send response back to Frontend (including the finalChatId)
    res.status(200).json({ 
      success: true, 
      answer: aiAnswer,
      newChatId: finalChatId 
    });

  } catch (error) {
    console.error("Backend Error:", error.message);
    res.status(500).json({ success: false, error: "Legal Engine busy." });
  }
};

exports.getChatHistory = async (req, res) => {
  try {
    const { userId, chatId } = req.body;
    
    if (!userId || userId === "GUEST" || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.json({ history: [] });
    }

    if (chatId) {
        const specificChat = await Chat.findById(chatId);
        return res.status(200).json({ 
            success: true, 
            history: specificChat ? specificChat.messages : [] 
        });
    } else {
        const userSessions = await Chat.find({ user: userId })
                                       .select('_id title updatedAt')
                                       .sort({ updatedAt: -1 });

        return res.status(200).json({ 
            success: true, 
            history: userSessions 
        });
    }
  } catch (err) {
    console.error("History Error:", err.message);
    res.status(500).json({ success: false });
  }
};