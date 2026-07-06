import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Scale, AlertCircle, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:5000';

const Register = () => {
  // --- STATE DECLARATIONS ---
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage(''); 
    
    // Validation
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        alert("Registration successful! You can now log in.");
        navigate('/login');
      } else {
        setErrorMessage(data.message || "Registration failed. This email might already exist.");
      }
    } catch (error) {
      setErrorMessage("Local server not reachable. Ensure Node.js (Port 5000) is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col justify-center py-12 px-6 font-['Plus_Jakarta_Sans',sans-serif] relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-green-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </Link>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link to="/" className="inline-flex flex-col items-center group">
          <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20 group-hover:bg-green-500/20 transition-all mb-4">
            <Scale className="text-green-500" size={32} />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter italic">
            Law<span className="text-green-500">Yar</span>
          </h2>
        </Link>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          Already have an account? <Link to="/login" className="font-bold text-green-500 hover:text-green-400">Sign in here</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/40 backdrop-blur-xl py-10 px-8 md:px-12 shadow-2xl border border-white/5 rounded-[2.5rem]">
          
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-wide">
              <AlertCircle size={18} /> {errorMessage}
            </div>
          )}

          <form className="flex flex-col gap-5" onSubmit={handleRegister}>
            {/* ROW 1: NAME */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950/50 text-white pl-12 pr-4 py-3.5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-green-500 outline-none transition-all placeholder:text-slate-700 font-medium" placeholder="Ali Khan" required />
              </div>
            </div>

            {/* ROW 2: EMAIL */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950/50 text-white pl-12 pr-4 py-3.5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-green-500 outline-none transition-all placeholder:text-slate-700 font-medium" placeholder="you@example.com" required />
              </div>
            </div>

            {/* ROW 3: PASSWORD */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950/50 text-white pl-12 pr-4 py-3.5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-green-500 outline-none transition-all placeholder:text-slate-700 font-medium" placeholder="••••••••" required />
              </div>
            </div>

            {/* ROW 4: CONFIRM PASSWORD */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Confirm Password</label>
              <div className="relative">
                <CheckCircle2 className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${confirmPassword && password === confirmPassword ? 'text-green-500' : 'text-slate-500'}`} size={18} />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full bg-slate-950/50 text-white pl-12 pr-4 py-3.5 border rounded-2xl focus:ring-1 outline-none transition-all placeholder:text-slate-700 font-medium ${confirmPassword && password !== confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-white/10 focus:ring-green-500'}`} placeholder="••••••••" required />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-2xl text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-green-600/20 active:scale-95 mt-2">
              {loading ? <><Loader2 className="animate-spin" size={18} /> Creating...</> : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;