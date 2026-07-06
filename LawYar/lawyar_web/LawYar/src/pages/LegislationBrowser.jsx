
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import Sidebar from '../components/layout/Sidebar';
import { Search, Book, FileText, ChevronRight, Loader2 } from 'lucide-react';

const LegislationBrowser = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [laws, setLaws] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate(); // Initialize navigation

  useEffect(() => {
    const fetchLaws = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/laws');
        const data = await response.json();
        setLaws(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching laws:", error);
        setLoading(false);
      }
    };
    fetchLaws();
  }, []);

  const filteredLaws = laws.filter(item => 
    item.law && item.law.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-8 py-6 shrink-0">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Book className="text-green-600" size={24} />
                Legislation Library
              </h1>
              <p className="text-slate-500 mt-1 text-sm">Browse and search the Pakistan Laws Dataset directly.</p>
            </div>
            <div className="relative w-full md:w-96">
              <input 
                type="text" 
                placeholder="Search Acts and Codes..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-shadow"
              />
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20">
                  <Loader2 className="animate-spin text-green-600 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-slate-900">Loading Laws from Database...</h3>
                </div>
              ) : filteredLaws.length > 0 ? (
                filteredLaws.map((item) => (
                  <div 
                    key={item._id} 
                    onClick={() => navigate(`/laws/${item.law}`)} // Navigate on click
                    className="bg-white border border-slate-200 rounded-xl p-5 hover:border-green-600 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between h-40"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded uppercase tracking-wider">
                          Statute
                        </span>
                        <span className="text-sm font-medium text-slate-400">Pakistan</span>
                      </div>
                      <h3 className="font-semibold text-slate-900 leading-snug group-hover:text-green-600 transition-colors">
                        {item.law}
                      </h3>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 text-slate-500 border-t border-slate-100 pt-3">
                      <span className="flex items-center gap-1 text-sm">
                        <FileText size={14} /> {item.total_chunks} Sections
                      </span>
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform text-green-600" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <Book size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900">No laws found</h3>
                  <p className="text-slate-500">Try adjusting your search terms.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LegislationBrowser;