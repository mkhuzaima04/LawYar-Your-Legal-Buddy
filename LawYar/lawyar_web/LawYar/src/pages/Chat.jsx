import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Disclaimer from './Disclaimer'; 
import ReactMarkdown from 'react-markdown';
import { Send, Mic, User, Scale, Volume2, Square, Sparkles, Loader2, LogIn } from 'lucide-react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

const Chat = () => {
  const navigate = useNavigate();
  const { chatId } = useParams();
  
  const [inputText, setInputText] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const [speakingId, setSpeakingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Welcome to LawYar. How can I assist you with Pakistani law today?',
      isLimitReached: false 
    }
  ]);

  const [guestCount, setGuestCount] = useState(() => {
    const savedCount = localStorage.getItem('guest_chat_count');
    return savedCount ? parseInt(savedCount, 10) : 0;
  });

  // Fetch History when URL changes
  useEffect(() => {
    const fetchHistory = async () => {
      const currentUserId = localStorage.getItem('userId');
      
      if (!currentUserId || !chatId) {
        setMessages([{ id: 1, sender: 'bot', text: 'Welcome to LawYar. How can I assist you with Pakistani law today?', isLimitReached: false }]);
        return; 
      }

      try {
        const API_BASE_URL = 'http://localhost:5000';
        setIsLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId, chatId: chatId })
        });

        const data = await response.json();
        
        if (data.success && data.history && data.history.length > 0) {
          const formattedHistory = data.history.map((msg, index) => ({
            id: `history-${index}`,
            sender: msg.sender,
            text: msg.text,
            isLimitReached: false
          }));

          setMessages([
            { id: 1, sender: 'bot', text: 'Welcome back to LawYar. Continuing your session.', isLimitReached: false },
            ...formattedHistory
          ]);
        } else {
            setMessages([{ id: 1, sender: 'bot', text: 'Welcome to LawYar. How can I assist you with Pakistani law today?', isLimitReached: false }]);
        }
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [chatId]);

  useEffect(() => {
    if (localStorage.getItem('userId')) {
      localStorage.removeItem('guest_chat_count');
      setGuestCount(0);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const toggleSpeech = (msgId, text) => {
    if ('speechSynthesis' in window) {
      if (speakingId === msgId) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.onstart = () => setSpeakingId(msgId);
      utterance.onend = () => setSpeakingId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleMicClick = () => {
    if (!recognition) {
      alert("Please use Google Chrome for Speech Recognition.");
      return;
    }
    if (isListening) {
      recognition.stop();
      return;
    }
    recognition.lang = language;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => setInputText(event.results[0][0].transcript);
    recognition.start();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const currentUserId = localStorage.getItem('userId');

    // Limit Check
    if (!currentUserId && guestCount >= 3) {
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        sender: 'bot', 
        text: "### 🛑 Access Limited\nYou have reached the **3-query limit** for guest users. To continue receiving accurate legal guidance, please log in.",
        isLimitReached: true 
      }]);
      setInputText('');
      return;
    }

    const userText = inputText;
    const senderId = currentUserId || 'GUEST';

    // 🔹 MAP ACTIVE CHAT CONTEXT TURNS FOR THE BACKEND GENERATION PIPELINE
    const formattedHistory = messages
      .filter(msg => msg.id !== 1) // Filter out the initial welcome message snippet
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userText, isLimitReached: false }]);
    setInputText('');
    setIsLoading(true);

    try {
      const API_BASE_URL = 'http://localhost:5000'; 
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userText, 
          userId: senderId, 
          chatId: chatId,
          language: language === 'ur-PK' ? 'Urdu' : 'English',
          history: formattedHistory // 🔹 INJECTED TRANSIT STATE ARRAY HERE
        })
      });

      const data = await response.json();

      if (response.status === 200 && data.success) {
        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          sender: 'bot', 
          text: data.answer,
          isLimitReached: false 
        }]);

        if (data.newChatId && !chatId) {
          navigate(`/chat/${data.newChatId}`, { replace: true });
        }

        if (!currentUserId) {
          setGuestCount(prev => {
            const newCount = prev + 1;
            localStorage.setItem('guest_chat_count', newCount.toString());
            return newCount;
          });
        }
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        sender: 'bot', 
        text: `**Error:** Check your server connection.`,
        isLimitReached: false
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#020617] overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .chat-scroll-container::-webkit-scrollbar { width: 5px; }
        .chat-scroll-container::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .markdown-content strong { color: #22c55e; font-weight: 800; }
        .markdown-content p { margin-bottom: 0.75rem; }
      `}</style>
      
      <Sidebar />
      
      <div className="flex-1 flex flex-col bg-[#020617] relative">
        {showDisclaimer && (
          <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-[2.5rem] relative chat-scroll-container">
                 <Disclaimer hideBackground={true} onAccept={() => setShowDisclaimer(false)} />
              </div>
          </div>
        )}

        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#020617] shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-green-500" />
            <h2 className="text-lg font-extrabold text-white tracking-tight">LawYar AI</h2>
          </div>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-slate-900 border border-white/10 text-xs font-bold text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-green-500">
            <option value="en-US">English</option>
            <option value="ur-PK">Urdu</option>
          </select>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 chat-scroll-container">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'bot' && (
                <div className="w-10 h-10 rounded-2xl bg-green-600 flex items-center justify-center flex-shrink-0 text-white shadow-lg mt-1"><Scale size={20} /></div>
              )}
              <div className="flex flex-col gap-2 max-w-3xl">
                <div className={`rounded-2xl p-5 shadow-xl leading-relaxed text-[0.95rem] ${msg.sender === 'user' ? 'bg-slate-800 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'}`}>
                  <div className="markdown-content">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>

                  {msg.isLimitReached === true && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3">
                      <button 
                        onClick={() => navigate('/login')}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-green-900/20"
                      >
                        <LogIn size={18} />
                        Login to Continue
                      </button>
                    </div>
                  )}
                </div>
                {msg.sender === 'bot' && msg.isLimitReached !== true && (
                  <button onClick={() => toggleSpeech(msg.id, msg.text)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-green-500 self-start transition-all px-1">
                    {speakingId === msg.id ? <><Square size={14} className="text-red-500 fill-current" /> Stop</> : <><Volume2 size={14} /> Read Aloud</>}
                  </button>
                )}
              </div>
              {msg.sender === 'user' && (
                <div className="w-10 h-10 rounded-2xl bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300 mt-1"><User size={20} /></div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 justify-start animate-pulse">
              <div className="w-10 h-10 rounded-2xl bg-green-600/20 flex items-center justify-center flex-shrink-0 text-green-500 mt-1">
                <Loader2 size={20} className="animate-spin" />
              </div>
              <div className="bg-white/5 border border-white/10 text-slate-400 rounded-2xl rounded-tl-none px-5 py-3 flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest">LawYar is researching...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-[#020617] border-t border-white/5">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
            <input 
              type="text" 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
              disabled={showDisclaimer || isLoading} 
              placeholder={isLoading ? "Please wait..." : "Ask about Pakistani Law..."} 
              className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-6 pr-28 py-5 text-white focus:outline-none focus:ring-1 focus:ring-green-500 shadow-2xl" 
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button type="button" onClick={handleMicClick} className={`p-3 rounded-xl transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-slate-500 hover:text-green-500'}`}><Mic size={20} /></button>
              <button type="submit" disabled={!inputText.trim() || isLoading} className="p-3 bg-green-600 text-white hover:bg-green-500 rounded-xl active:scale-90 flex items-center justify-center">
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;