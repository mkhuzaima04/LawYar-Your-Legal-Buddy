import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare, BookOpen, ShieldCheck, ArrowRight,
  Scale, Users, ChevronRight, Sparkles, FileText, Search
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const CHAT_DEMO = [
  { from: 'user', text: 'What are my rights if my landlord refuses to return my security deposit?' },
  { from: 'bot',  text: 'Under the Rent Restriction Ordinance, your landlord must return the deposit within 30 days.' },
  { from: 'user', text: 'Yes, show me the relevant sections.' },
  { from: 'bot',  text: 'Section 17 of the Rent Restriction Ordinance 1959 governs deposit refunds.' },
];

const STATS = [
  { num: '1,200+', label: 'Acts & Ordinances' },
  { num: '50ms',   label: 'Avg Response' },
  { num: '2',      label: 'Languages' },
  { num: '100%',   label: 'Free to Use' },
];

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Conversational AI',
    body: 'Ask anything in plain Urdu or English. Get statute-backed answers grounded in actual Pakistani legislation.',
    // Updated: High-end legal-tech background (Library close-up)
    img: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&q=80',
  },
  {
    icon: BookOpen,
    title: 'Law Browser',
    body: 'Browse the complete Pakistan Laws Dataset. Every Act, Code, and Ordinance — searchable and cross-referenced.',
    img: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=600&q=80',
  },
  {
    icon: ShieldCheck,
    title: 'Case History',
    body: 'Save every query and build a personal legal research trail. Resume any thread and never lose context.',
    img: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80',
  },
];

const TICKER = [
  'Constitution of Pakistan · 1973', 'Pakistan Penal Code · 1860', 'Family Laws Ordinance · 1961', 'Contract Act · 1872'
];

function Home() {
  const [bubbles, setBubbles] = useState(0);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => { 
      i++; 
      setBubbles(i); 
      if (i >= CHAT_DEMO.length) clearInterval(id); 
    }, 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-white font-['Plus_Jakarta_Sans',sans-serif] overflow-hidden">
      <Navbar />
      
      <main className="flex-1">
        {/* --- HERO SECTION --- */}
        <section className="relative min-h-screen flex items-center pt-20 px-6 lg:px-12 mb-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
          
          <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />

          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
            
            {/* LEFT CONTENT */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                <Sparkles size={14} className="text-green-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500">
                  AI-Powered · Pakistan Laws Dataset
                </span>
              </div>

              <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] italic">
                Pakistan's Law,<br />
                <span className="text-green-500">finally speaking your language.</span>
              </h1>

              <p className="max-w-lg text-slate-400 text-lg leading-relaxed font-medium">
                LawYar is an AI assistant trained on 1,200+ Pakistani statutes. 
                Ask in Urdu or English — get answers backed by real law.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to="/chat" className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-green-600/30 active:scale-95 flex items-center gap-2">
                  Start Chatting <ArrowRight size={16} />
                </Link>
                <Link to="/laws" className="border border-white/10 hover:border-green-500/50 bg-white/5 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95">
                  Browse Laws
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-12 pt-8">
                {STATS.map((s, i) => (
                  <div key={i} className="space-y-2">
                    <div className="text-4xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                      {s.num}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-green-500 drop-shadow-md">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT CONTENT (VISUAL DEMO) */}
            <div className="hidden lg:block relative group">
              <div className="rounded-[4rem] overflow-hidden border border-white/10 relative shadow-2xl h-[550px] transform transition-all duration-700">
                {/*  Updated Background Image for the Main Hero Visual */}
                <img 
                  src="https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1000&q=80" 
                  className="w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110" 
                  alt="Pakistan Law Library"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/20 to-transparent" />
                
                {/* Floating Chat Demo (Maintained Dimensions) */}
                <div className="absolute bottom-10 -left-0.5 w-80 bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-7 shadow-2xl space-y-4 animate-bounce-slow">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-ping shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live Chat</span>
                  </div>
                  <div className="space-y-3">
                    {CHAT_DEMO.slice(0, bubbles).map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                        <div className={`p-3 rounded-2xl text-[11px] font-bold max-w-[90%] leading-relaxed ${msg.from === 'user' ? 'bg-green-600/20 text-green-400 border border-green-500/20' : 'bg-white/5 text-slate-100 border border-white/10 shadow-xl'}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* --- FEATURES SECTION --- */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="mb-20">
            <div className="w-12 h-1 bg-green-500 mb-6 rounded-full" />
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter italic">
              Everything you need.<br />
              <span className="text-slate-600">Nothing you don't.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {FEATURES.map((f, i) => (
              <div key={i} className="group bg-white/5 border border-white/5 rounded-[3rem] overflow-hidden hover:border-green-500/50 transition-all duration-500 hover:shadow-2xl">
                <div className="h-56 overflow-hidden relative">
                  <img src={f.img} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110" alt={f.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020617] to-transparent" />
                </div>
                <div className="p-10 space-y-4 text-center">
                  <div className="p-4 bg-green-500/10 rounded-2xl w-fit mx-auto text-green-500 group-hover:scale-110 transition-transform">
                    {React.createElement(f.icon, { size: 28 })}
                  </div>
                  <h3 className="text-2xl font-black italic text-white tracking-tight leading-tight">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed font-semibold">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 40s linear infinite;
        }
        .animate-bounce-slow {
          animation: bounce 6s infinite ease-in-out;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
}

export default Home;