import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Scale, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:5000';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

 const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      // Inside handleLogin in Login.jsx
const data = await response.json();

if (response.ok) {
    localStorage.setItem('token', data.token);
    // This is the exact key Chat.jsx looks for
    localStorage.setItem('userId', data.user._id || data.user.id); 
    localStorage.setItem('user', JSON.stringify(data.user));
    
    navigate('/chat');
} else {
        setErrorMessage(data.message || "Login failed. Check your credentials.");
      }
    } catch (error) {
      setErrorMessage("Server not reachable. Please check if Node.js is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col justify-center py-12 px-6 font-['Plus_Jakarta_Sans',sans-serif] relative overflow-hidden">
      
      {/* --- BACKGROUND DECORATION --- */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-green-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* --- BACK TO HOME BUTTON (Optional floating button) --- */}
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </Link>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* --- LOGO AS HOME LINK --- */}
        <Link to="/" className="inline-flex flex-col items-center group">
          <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20 group-hover:bg-green-500/20 transition-all mb-4">
            <Scale className="text-green-500" size={40} />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter italic">
            Law<span className="text-green-500">Yar</span>
          </h2>
          <p className="mt-2 text-slate-500 text-sm font-medium">Secure Legal Portal Login</p>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/40 backdrop-blur-xl py-10 px-10 shadow-2xl border border-white/5 rounded-[2.5rem]">
          
          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-wide">
              <AlertCircle size={18} /> {errorMessage}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 text-white pl-12 pr-4 py-3.5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-green-500 outline-none transition-all placeholder:text-slate-700 font-medium"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 text-white pl-12 pr-4 py-3.5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-green-500 outline-none transition-all placeholder:text-slate-700 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-2xl text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-green-600/20 active:scale-95"
            >
              {loading ? <><Loader2 className="animate-spin" size={18} /> Authenticating...</> : "Sign In to LawYar"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-sm text-slate-500 font-medium">
              New to our platform? <Link to="/register" className="text-green-500 font-bold hover:text-green-400 transition-colors">Create Account</Link>
            </p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
      `}} />
    </div>
  );
};

export default Login;