import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Login from './pages/Login';
import Register from './pages/Register';
import About from './pages/About';
import LegislationBrowser from './pages/LegislationBrowser';
import LawDetails from './pages/LawDetails';
import Disclaimer from './pages/Disclaimer';
// 1. 👉 Import the new FAQs page
import FAQs from './pages/FAQs';

function App() {
  return (
    <Router>
      {/* Elite theme background applied */}
      <div className="min-h-screen bg-[#020617] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          
          {/* ✅ Core Chat Routes */}
          <Route path="/chat" element={<Chat />} /> {/* For New Chats */}
          <Route path="/chat/:chatId" element={<Chat />} /> {/* For Specific Past Chats */}
          
          <Route path="/laws" element={<LegislationBrowser />} />
          <Route path="/laws/:lawName" element={<LawDetails />} />
          
          {/* 2. 👉 Add the FAQ route here */}
          <Route path="/faq" element={<FAQs />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;