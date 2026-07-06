import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, Mail, ShieldAlert, Globe, Share2 } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#020617] text-slate-400 py-16 border-t border-white/5 font-['Plus_Jakarta_Sans',sans-serif] shrink-0">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        
        {/* --- BRAND SECTION --- */}
        <div className="space-y-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20 group-hover:bg-green-500/20 transition-all duration-300">
              <Scale className="text-green-500" size={22} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter italic">
              Law<span className="text-green-500">Yar</span>
            </h1>
          </Link>
          <p className="text-sm leading-relaxed text-slate-500 max-w-xs">
            Your specialized AI-powered legal assistant for the Pakistan Laws Dataset. 
            Navigating legislation with precision and speed.
          </p>
          <div className="flex gap-4">
            {/* Using Share2 and Globe icons as they are stable exports */}
            <a href="#" className="p-2 rounded-lg bg-slate-900 border border-white/5 hover:border-green-500/50 hover:text-green-500 transition-all duration-300">
              <Globe size={18} />
            </a>
            <a href="#" className="p-2 rounded-lg bg-slate-900 border border-white/5 hover:border-green-500/50 hover:text-green-500 transition-all duration-300">
              <Share2 size={18} />
            </a>
          </div>
        </div>

        {/* --- EXPLORE --- */}
        <div>
          <h4 className="text-white font-bold text-[11px] uppercase tracking-[0.2em] mb-6">Explore</h4>
          <ul className="space-y-4 text-sm font-semibold">
            <li><Link to="/" className="hover:text-green-500 transition-colors">Home</Link></li>
            <li><Link to="/laws" className="hover:text-green-500 transition-colors">Legislation</Link></li>
            <li><Link to="/about" className="hover:text-green-500 transition-colors">About Project</Link></li>
            <li><Link to="/chat" className="hover:text-green-500 transition-colors">Assistant</Link></li>
          </ul>
        </div>

        {/* --- SUPPORT --- */}
        <div>
          <h4 className="text-white font-bold text-[11px] uppercase tracking-[0.2em] mb-6">Support</h4>
          <ul className="space-y-4 text-sm font-semibold">
            <li><Link to="/faq" className="hover:text-green-500 transition-colors">FAQs</Link></li>
            <li><Link to="/disclaimer" className="hover:text-green-500 transition-colors">Legal Disclaimer</Link></li>
            {/*<li>
              <a href="mailto:support@lawyar.pk" className="hover:text-green-500 transition-colors flex items-center gap-2 text-xs">
                Contact <Mail size={14} />
              </a>
            </li>*/}
          </ul>
        </div>

        {/* --- DISCLAIMER BOX --- */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldAlert size={40} className="text-green-500" />
          </div>
          <h4 className="text-white font-bold text-[10px] uppercase tracking-[0.2em] mb-3">Notice</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            LawYar provides information for educational purposes. It is not a substitute for professional legal advice from a licensed advocate.
          </p>
        </div>
      </div>

      {/* --- BOTTOM BAR --- */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
          © {currentYear} LawYar · Final Year Project
        </p>
        <div className="flex gap-8 text-[11px] font-bold uppercase tracking-widest text-slate-600">
          <Link to="/terms" className="hover:text-green-500 transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-green-500 transition-colors">Privacy</Link>
          <span className="text-white transition-colors">Made in Pakistan</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&display=swap');
      `}} />
    </footer>
  );
};

export default Footer;