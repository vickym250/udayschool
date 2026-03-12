import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { ChevronLeft, Calendar as CalendarIcon, CheckCircle2, XCircle, Info } from "lucide-react";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function Attendance() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [month, setMonth] = useState(months[new Date().getMonth()]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    const unsub = onSnapshot(doc(db, "students", studentId), (snap) => {
      if (snap.exists()) {
        setStudent({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [studentId]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  // --- Attendance Logic ---
  const monthData = student?.attendance?.[month] || {};
  const daysInMonth = new Date(new Date().getFullYear(), months.indexOf(month) + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  let presentCount = 0;
  let absentCount = 0;
  days.forEach((d) => {
    const status = monthData[`${month}_day_${d}`];
    if (status === "P") presentCount++;
    if (status === "A") absentCount++;
  });

  const totalMarked = presentCount + absentCount;
  const percentage = totalMarked === 0 ? 0 : Math.round((presentCount / totalMarked) * 100);

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans">
      {/* Sticky Header */}
      <div className="bg-white px-4 py-4 flex items-center shadow-sm sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors mr-2">
          <ChevronLeft size={24} className="text-blue-900" />
        </button>
        <h1 className="text-xl font-black text-blue-900 tracking-tight">Attendance Log</h1>
      </div>

      <div className="max-w-md mx-auto p-4">
        
        {/* Performance Overview */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 mb-6 flex items-center justify-between overflow-hidden relative">
            <div className="z-10">
                <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest mb-1">Monthly Performance</p>
                <h2 className="text-3xl font-black text-blue-600">{percentage}%</h2>
                <div className="flex gap-3 mt-2">
                    <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                        <CheckCircle2 size={12} /> P: {presentCount}
                    </span>
                    <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                        <XCircle size={12} /> A: {absentCount}
                    </span>
                </div>
            </div>
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-200">
                <CalendarIcon size={40} />
            </div>
        </div>

        {/* Month Horizontal Scroll */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-4">
          {months.map((m) => (
            <button
              key={m}
              onClick={() => setMonth(m)}
              className={`px-6 py-3 rounded-2xl font-black text-xs transition-all whitespace-nowrap ${
                month === m 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                : "bg-white text-slate-400 border border-slate-100"
              }`}
            >
              {m.substring(0, 3).toUpperCase()}
            </button>
          ))}
        </div>

        {/* Attendance Grid */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-blue-900 flex items-center gap-2">
               {month} Records
            </h3>
            <span className="bg-slate-50 text-slate-400 p-2 rounded-xl">
                <Info size={16} />
            </span>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {days.map((d) => {
              const status = monthData[`${month}_day_${d}`];
              return (
                <div key={d} className="flex flex-col items-center group">
                  <span className="text-[10px] font-bold text-slate-300 mb-1 group-hover:text-blue-400 transition-colors">{d}</span>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all ${
                    status === "P" 
                    ? "bg-green-50 text-green-600 border-2 border-green-100" 
                    : status === "A" 
                    ? "bg-red-50 text-red-500 border-2 border-red-100" 
                    : "bg-slate-50 text-slate-300 border-2 border-transparent"
                  }`}>
                    {status || "-"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center mt-10 text-[10px] text-slate-300 font-bold uppercase tracking-[0.3em]">
            Sunshine School Portal
        </p>
      </div>
    </div>
  );
}