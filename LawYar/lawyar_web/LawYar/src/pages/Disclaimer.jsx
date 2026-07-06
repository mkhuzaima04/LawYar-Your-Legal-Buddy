import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight, Gavel } from 'lucide-react';

// Added { onAccept } to props to handle the modal close logic
const Disclaimer = ({ onAccept }) => {
  const navigate = useNavigate();

  const handleAgreement = () => {
    if (onAccept) {
      onAccept(); // If used as a modal in Chat.jsx, it closes the modal
    } else {
      navigate('/chat'); // If used as a standalone page, it redirects
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col justify-center items-center p-6 font-['Plus_Jakarta_Sans',sans-serif] relative overflow-hidden">
      
      {/* Background Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-green-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-xl">
        {/* --- GLASS CARD --- */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-10 md:p-14 border border-white/5 shadow-2xl shadow-black/50 relative overflow-hidden">
          
          {/* Subtle icon watermark */}
          <div className="absolute -top-6 -right-6 text-white/5 pointer-events-none rotate-12">
             <Gavel size={200} />
          </div>

          <div className="relative z-10 text-center">
            {/* Header Icon */}
            <div className="flex justify-center mb-8">
              <div className="p-5 bg-green-500/10 text-green-500 rounded-2xl border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                <ShieldAlert size={40} />
              </div>
            </div>

            <h1 className="text-3xl font-black text-white tracking-tighter mb-6 uppercase leading-tight">
              Legal <span className="text-green-500">Disclaimer</span>
            </h1>

            <div className="space-y-6 text-slate-400 leading-relaxed mb-10 text-sm font-medium text-center">
              <p>
                Welcome to <strong className="text-white">LawYar</strong>. This application is an AI-powered tool designed to help citizens understand their rights and access the Pakistan Laws Dataset.
              </p>
              
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl italic text-slate-200 shadow-inner">
                "The information provided by LawYar is for educational and informational purposes only. It does not constitute professional legal advice."
              </div>
              
              <p className="px-4">
                By continuing, you acknowledge that you should consult with a qualified, practicing attorney for official legal counsel regarding your specific situation.
              </p>
            </div>

            {/* Premium Button */}
            <button 
              onClick={handleAgreement}
              className="group relative w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 px-8 rounded-2xl transition-all shadow-lg shadow-green-600/30 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs overflow-hidden"
            >
              <span className="relative z-10">I Understand and Agree</span>
              <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
              
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[10px] text-slate-600 mt-8 uppercase tracking-[0.3em] font-black">
          Grounded in Pakistan Statutes · 2026 Edition
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
};

export default Disclaimer;