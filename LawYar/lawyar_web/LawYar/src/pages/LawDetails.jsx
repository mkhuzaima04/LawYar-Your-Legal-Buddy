import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, BookOpen, Scale } from 'lucide-react';

const LawDetails = () => {
  const { lawName } = useParams();
  const navigate = useNavigate();
  const [lawData, setLawData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFullLaw = async () => {
      try {
        // This call gets the law PLUS all the sections (chunks)
        const response = await fetch(`http://localhost:5000/api/laws/${lawName}`);
        const data = await response.json();
        setLawData(data);
        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
        setLoading(false);
      }
    };
    fetchFullLaw();
  }, [lawName]);

  if (loading) return <div className="p-10 text-center">Loading full text...</div>;
  if (!lawData) return <div className="p-10 text-center">Law not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-green-600 mb-6 transition-colors"
        >
          <ChevronLeft size={20} /> Back to Library
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{lawData.law}</h1>
            <div className="flex gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1"><BookOpen size={16}/> {lawData.total_chunks} Sections</span>
              <span className="flex items-center gap-1"><Scale size={16}/> Statutory Law of Pakistan</span>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {lawData.chunks.map((chunk, index) => (
              <div key={index} className="group">
                <div className="flex items-start gap-4">
                  <div className="bg-green-50 text-green-700 font-bold px-3 py-1 rounded text-sm mt-1">
                    § {chunk.section_number}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-lg mb-2">
                      {chunk.section_title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {chunk.text}
                    </p>
                  </div>
                </div>
                <hr className="mt-8 border-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LawDetails;

