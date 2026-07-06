import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Scale, MessageSquare, LogIn, UserPlus } from "lucide-react";

const Navbar = () => {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/*  TOP RIBBON */}
      <div className="w-full h-[3px] bg-gradient-to-r from-green-500 via-emerald-500 to-green-400" />

      {/*  MAIN NAVBAR */}
      <nav className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-lg border-b border-white/10 font-['Plus_Jakarta_Sans',sans-serif]">

        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          {/*  LOGO */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 group-hover:scale-105 transition duration-300">
              <Scale className="text-green-400" size={20} />
            </div>
            <span className="text-white font-black text-xl tracking-tighter italic">
              Law<span className="text-green-400">Yar</span>
            </span>
          </Link>

          {/*  CENTER NAV */}
          <div className="hidden md:flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            {[
              { name: "Legislation", path: "/laws" },
              { name: "About", path: "/about" },
            ].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                  isActive(item.path)
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/*  RIGHT SIDE (Auth & Assistant) */}
          <div className="flex items-center gap-3">
            
            {/* Login Button */}
            <Link
              to="/login"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-xs font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all duration-300"
            >
              <LogIn size={14} />
              Sign In
            </Link>

            {/* Sign Up Button */}
            <Link
              to="/register"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-green-400 text-xs font-black uppercase tracking-widest hover:border-green-400/50 transition-all duration-300"
            >
              <UserPlus size={14} />
              Register
            </Link>

            {/* Divider */}
            <div className="h-6 w-[1px] bg-white/10 mx-1 hidden sm:block" />

            {/* Assistant Button */}
            <Link
              to="/chat"
              className="flex items-center gap-2 px-5 py-2 rounded-lg 
              bg-green-600 text-white 
              text-xs font-black uppercase tracking-widest hover:bg-green-500 transition-all duration-300 
              shadow-lg shadow-green-600/20 active:scale-95"
            >
              <MessageSquare size={14} />
              Assistant
            </Link>
            
          </div>

        </div>
      </nav>
    </>
  );
};

export default Navbar;