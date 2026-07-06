import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Scale, Plus, MessageSquare, BookOpen, User, LogOut, ChevronUp, Loader2, LogIn, MessageCircle } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:5000';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [userData, setUserData] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');

    if (savedUser && storedUserId) {
      const parsedUser = JSON.parse(savedUser);
      setUserData(parsedUser);
      fetchChatHistory(storedUserId, token);
    }
  }, [location.pathname]); //  Refreshes history list when URL changes (e.g., after creating a new chat)

  const fetchChatHistory = async (userId, token) => {
    if (!userId) return;
    setHistoryLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();
      if (response.ok) {
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Sidebar History Error:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUserData(null);
    setHistory([]);
    setIsMenuOpen(false);
    navigate('/');
  };

  return (
    <div className="w-64 bg-slate-950 text-slate-300 flex flex-col justify-between h-screen shadow-xl z-10 flex-shrink-0 font-['Plus_Jakarta_Sans',sans-serif]">
      
      <div className="p-4 flex flex-col h-full overflow-hidden">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 mb-8 px-2 mt-2 group transition-all">
          <Scale className="text-green-500 group-hover:rotate-12 transition-transform" size={28} />
          <h1 className="text-2xl font-black text-white tracking-tighter italic">
            Law<span className="text-green-500">Yar</span>
          </h1>
        </Link>

        {/* New Query */}
        <button 
          onClick={() => navigate('/chat')}
          className="w-full bg-green-600 hover:bg-green-500 text-white py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold mb-8 shadow-lg shadow-green-600/20 active:scale-95"
        >
          <Plus size={18} />
          New Legal Query
        </button>

        {/* Navigation */}
        <div className="space-y-1 mb-8">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">Main Menu</h3>
          <Link to="/chat" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-semibold text-sm ${location.pathname === '/chat' ? 'bg-slate-800 text-white shadow-lg' : 'hover:bg-slate-900 text-slate-400'}`}>
            <MessageSquare size={18} className={location.pathname === '/chat' ? 'text-green-500' : ''} />
            <span>AI Assistant</span>
          </Link>
          <Link to="/laws" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-semibold text-sm ${location.pathname === '/laws' ? 'bg-slate-800 text-white shadow-lg' : 'hover:bg-slate-900 text-slate-400'}`}>
            <BookOpen size={18} className={location.pathname === '/laws' ? 'text-green-500' : ''} />
            <span>Legislation Library</span>
          </Link>
        </div>

        {/* Recent Cases (Sidebar History) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">Recent Queries</h3>
          {historyLoading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
              <Loader2 className="animate-spin" size={14} /> Loading history...
            </div>
          ) : history.length > 0 ? (
            <ul className="space-y-1">
              {history.map((session) => (
                <li 
                  key={session._id} 
                  onClick={() => navigate(`/chat/${session._id}`)} 
                  className={`px-3 py-2 rounded-lg cursor-pointer text-xs truncate transition-all font-medium border-l-2 ${location.pathname === `/chat/${session._id}` ? 'bg-slate-800 text-white border-green-500' : 'text-slate-500 hover:text-white hover:bg-slate-900 border-transparent hover:border-green-500/50 flex items-center gap-2'}`}
                >
                  <MessageCircle size={12} className="opacity-50 flex-shrink-0" />
                  {/* Show title from DB, strictly handle empty cases */}
                  <span className="truncate">{session.title ? session.title : "New Session"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 text-xs text-slate-600 italic font-medium">
              {userData ? "Your history will appear here." : "Login to view history."}
            </p>
          )}
        </div>
      </div>

      {/* Profile Section */}
      <div className="p-4 border-t border-white/5 relative bg-slate-950">
        {isMenuOpen && (
          <div className="absolute bottom-20 left-4 right-4 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-2 mb-2 animate-in fade-in slide-in-from-bottom-2">
            {!userData ? (
              <button onClick={() => navigate('/login')} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-green-500/10 text-green-500 rounded-xl text-xs font-bold transition-all uppercase tracking-widest">
                <LogIn size={14} /> Login / Sign Up
              </button>
            ) : (
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-red-500/10 text-red-400 rounded-xl text-xs font-bold transition-all uppercase tracking-widest">
                <LogOut size={14} /> Logout
              </button>
            )}
          </div>
        )}

        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`flex items-center justify-between w-full p-2 rounded-2xl transition-all duration-300 ${isMenuOpen ? 'bg-slate-900 shadow-inner' : 'hover:bg-slate-900'}`}>
          <div className="flex items-center gap-3 truncate">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white font-black border border-white/10 flex-shrink-0 shadow-lg shadow-green-600/20">
              {userData ? userData.name.charAt(0).toUpperCase() : <User size={18} />}
            </div>
            <div className="text-left truncate">
              <p className="font-bold text-white text-xs truncate uppercase tracking-wider">{userData ? userData.name : "Guest User"}</p>
              <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.1em]">{userData ? "Pro Account" : "Limited Access"}</p>
            </div>
          </div>
          <ChevronUp size={14} className={`text-slate-600 transition-transform duration-500 ${isMenuOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;