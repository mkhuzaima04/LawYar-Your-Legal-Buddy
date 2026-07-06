import React from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { Target, Code, Scale, ShieldCheck, Zap, Globe, Cpu } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-white font-['Plus_Jakarta_Sans',sans-serif] flex flex-col overflow-hidden">
      <Navbar />

      <main className="flex-1 relative">
        {/* --- DECORATIVE BACKGROUND --- */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

        {/* --- HERO HEADER --- */}
        <div className="relative pt-24 pb-16 px-6 text-center border-b border-white/5">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20 mb-8 animate-pulse">
              <Scale className="text-green-500" size={48} />
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic mb-6">
              About <span className="text-green-500">LawYar</span>
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed font-medium max-w-2xl">
              Democratizing legal knowledge through Artificial Intelligence. Bridging the gap between 1,200+ Pakistani statutes and the everyday citizen.
            </p>
          </div>
        </div>

        {/* --- CONTENT GRID --- */}
        <div className="max-w-6xl mx-auto py-24 px-6 space-y-32">
          
          {/* MISSION SECTION */}
          <section className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest">
                <Target size={12} /> The Mission
              </div>
              <h2 className="text-4xl font-black tracking-tighter italic text-white">Empowering Legal Literacy</h2>
              <p className="text-slate-400 leading-relaxed text-lg">
                Legal systems are often locked behind complex jargon and expensive consultations. LawYar was conceived to break these barriers by providing a direct, simplified interface to the law.
              </p>
              <div className="space-y-4">
                {[
                  { icon: ShieldCheck, text: "Verified statute-backed responses" },
                  { icon: Globe, text: "Bilingual support in Urdu and English" },
                  { icon: Zap, text: "Instant mapping to Pakistani Ordinances" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-200 font-semibold">
                    <item.icon className="text-green-500" size={20} />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl relative group">
              <img 
                src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80" 
                className="w-full h-80 object-cover grayscale group-hover:grayscale-0 transition-all duration-1000"
                alt="Law books"
              />
              <div className="absolute inset-0 bg-green-500/10" />
            </div>
          </section>

          {/* TECHNOLOGY SECTION */}
          <section className="space-y-12 text-center pb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest">
              <Cpu size={12} /> Technical Architecture
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter italic text-white">Engineered for Accuracy</h2>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              {[
                { title: "Frontend", desc: "React.js with Tailwind CSS for an elite, responsive UI.", icon: Code },
                { title: "Backend API", desc: "Node.js & Express handling secure legal data flow.", icon: Zap },
                { title: "Database", desc: "MongoDB for encrypted chat histories and case logs.", icon: Cpu },
                { title: "AI Engine", desc: "Python NLP models for RAG-based legal retrieval.", icon: Scale }
              ].map((tech, i) => (
                <div key={i} className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem] hover:border-green-500/30 transition-all group">
                  <tech.icon className="text-green-500 mb-6 group-hover:scale-110 transition-transform" size={32} />
                  <h3 className="text-xl font-black text-white mb-3 italic tracking-tight">{tech.title}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{tech.desc}</p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>

      <Footer />
      
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
      `}} />
    </div>
  );
};

export default About;