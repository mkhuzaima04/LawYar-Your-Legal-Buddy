import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { HelpCircle, ChevronDown, Scale, ShieldCheck, Zap, MessageSquare } from 'lucide-react';

const FAQ_DATA = [
  {
    question: "What is LawYar?",
    answer: "LawYar is an AI-powered legal assistant designed specifically for Pakistani legislation. It is trained on over 1,200+ official statutes, Acts, and Ordinances to provide accurate, grounded answers to legal inquiries in plain English and Urdu.",
    icon: Scale
  },
  {
    question: "Is LawYar a replacement for a lawyer?",
    answer: "No. LawYar is an educational tool meant to increase legal literacy. While it provides statute-backed information, it does not constitute professional legal advice. Users should always consult with a qualified legal professional for official representation.",
    icon: ShieldCheck
  },
  {
    question: "Does it support Urdu queries?",
    answer: "Yes. LawYar is a bilingual platform. You can describe your legal issues or ask questions in Urdu, and the AI will analyze the Urdu text to find the corresponding legal provisions in the Pakistan Law dataset.",
    icon: Zap
  },
  {
    question: "How accurate is the AI's response?",
    answer: "LawYar utilizes Retrieval-Augmented Generation (RAG). This means the AI doesn't 'guess' answers; it retrieves actual text from the Pakistan Law Dataset and uses that specific context to generate a response, significantly reducing the risk of hallucination.",
    icon: MessageSquare
  },
  {
    question: "What laws are covered in the database?",
    answer: "The database covers a wide range of Pakistani legislation from 1947 to 2026, including the Pakistan Penal Code (PPC), Code of Civil Procedure (CPC), Family Laws, Rent Restriction Ordinances, and the Constitution of Pakistan.",
    icon: Scale
  }
];

const FAQItem = ({ question, answer, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`group border border-white/5 rounded-[2rem] transition-all duration-500 overflow-hidden ${isOpen ? 'bg-white/5 border-green-500/30 shadow-2xl' : 'bg-white/[0.02] hover:border-white/10'}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-8 py-7 flex items-center justify-between text-left transition-all"
      >
        <div className="flex items-center gap-5">
          <div className={`p-3 rounded-xl transition-all duration-500 ${isOpen ? 'bg-green-600 text-white' : 'bg-green-500/10 text-green-500'}`}>
            <Icon size={20} />
          </div>
          <span className="text-lg font-bold text-white tracking-tight leading-tight">{question}</span>
        </div>
        <ChevronDown 
          className={`text-slate-500 transition-transform duration-500 ${isOpen ? 'rotate-180 text-green-500' : 'group-hover:text-white'}`} 
          size={20} 
        />
      </button>
      
      <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-8 pb-8 pt-0 ml-14">
          <div className="w-full h-[1px] bg-white/5 mb-6" />
          <p className="text-slate-400 leading-relaxed font-semibold">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
};

const FAQs = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-white font-['Plus_Jakarta_Sans',sans-serif] flex flex-col overflow-hidden">
      <Navbar />

      <main className="flex-1 relative">
        {/* --- DECORATIVE GLOWS --- */}
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-[140px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

        {/* --- HERO HEADER --- */}
        <div className="relative pt-24 pb-16 px-6 text-center border-b border-white/5">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20 mb-8">
              <HelpCircle className="text-green-500" size={48} />
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic mb-6 leading-tight">
              Knowledge <span className="text-green-500">Base</span>
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed font-medium max-w-2xl">
              Find answers to common questions about LawYar's capabilities, accuracy, and legal scope.
            </p>
          </div>
        </div>

        {/* --- FAQ SECTION --- */}
        <div className="max-w-3xl mx-auto py-24 px-6 space-y-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest">
              General Inquiries
            </div>
          </div>

          {FAQ_DATA.map((item, index) => (
            <FAQItem key={index} {...item} />
          ))}

          {/* --- CONTACT CTA --- */}
          <div className="mt-20 p-10 rounded-[3rem] bg-gradient-to-br from-green-600/20 to-emerald-900/10 border border-green-500/20 text-center">
            <h3 className="text-2xl font-black italic mb-3">Still have questions?</h3>
            <p className="text-slate-400 font-semibold mb-8">Reach out to the development team for deeper technical insights.</p>
            <a 
              href="mailto:contact@lawyar.com" 
              className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-green-600/20"
            >
              Contact Support
            </a>
          </div>
        </div>
      </main>

      <Footer />
      
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
      `}} />
    </div>
  );
};

export default FAQs;