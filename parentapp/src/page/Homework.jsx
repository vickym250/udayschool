import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "../firebase";
import { ChevronLeft, Volume2, StopCircle, BookOpen, Calendar, Clock } from "lucide-react";

export default function Homework() {
  const { className } = useParams(); // App.js se class name lega
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [speakingId, setSpeakingId] = useState(null);
  const [lang, setLang] = useState(localStorage.getItem("appLang") || "en");

  // Session Calculation (April to March)
  const getSession = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 4 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
  };
  const currentSession = getSession();

  useEffect(() => {
    if (!className) return;

    // Optimized Firestore Query
    const q = query(
      collection(db, "homework"),
      where("className", "==", className),
      where("session", "==", currentSession),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const now = new Date().getTime();
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((item) => {
          if (item.deletedAt) return false;
          
          // Expiry Logic
          const hwTime = item.createdAt?.toDate ? item.createdAt.toDate().getTime() : new Date(item.createdAt).getTime();
          const expiryTime = (item.visibleDays || 1) * 24 * 60 * 60 * 1000;
          return (now - hwTime) <= expiryTime;
        });

      setList(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.speechSynthesis.cancel(); // Voice stop on unmount
    };
  }, [className, currentSession]);

  // Web Speech API Logic
  const speakHomework = (item) => {
    window.speechSynthesis.cancel();
    if (speakingId === item.id) {
      setSpeakingId(null);
      return;
    }

    setSpeakingId(item.id);
    const text = `${lang === "en" ? "Subject" : "विषय"} ${item.subject}. ${item.title}. ${item.description}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "en" ? "en-US" : "hi-IN";
    utterance.rate = 0.9;
    
    utterance.onend = () => setSpeakingId(null);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center shadow-sm sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full mr-2">
          <ChevronLeft size={24} className="text-blue-900" />
        </button>
        <div>
          <h1 className="text-lg font-black text-blue-900 leading-none">Recent Homework</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Class {className} | {currentSession}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {loading && <div className="text-center py-10 font-bold text-blue-600">Loading...</div>}
        
        {!loading && list.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-200">
            <BookOpen size={40} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 font-bold italic">No active homework found.</p>
          </div>
        )}

        {list.map((item) => (
          <div key={item.id} className="bg-white rounded-[32px] p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
            {/* Subject Badge */}
            <div className="flex justify-between items-start mb-4">
              <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider">
                {item.subject || "General"}
              </span>
              <button 
                onClick={() => speakHomework(item)}
                className={`p-3 rounded-2xl transition-all ${speakingId === item.id ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-blue-600'}`}
              >
                {speakingId === item.id ? <StopCircle size={20} /> : <Volume2 size={20} />}
              </button>
            </div>

            <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight">{item.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">{item.description}</p>

            {/* Footer Info */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <div className="flex items-center gap-1 text-slate-400">
                <Calendar size={12} />
                <span className="text-[10px] font-bold uppercase">{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1 text-blue-400">
                <Clock size={12} />
                <span className="text-[10px] font-bold uppercase">Visible: {item.visibleDays || 1} Days</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}