import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where 
} from "firebase/firestore";
import { 
  HiOutlinePhone, 
  HiChatAlt2, 
  HiOutlineCalendar,
  HiCollection,
  HiUserCircle,
  HiPhoneOutgoing
} from "react-icons/hi";

export default function AbsentStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [selectedMonth, setSelectedMonth] = useState(months[today.getMonth()]);
  const [session, setSession] = useState("2025-26");
  const [className, setClassName] = useState("All");

  useEffect(() => {
    setLoading(true);
    let q = query(collection(db, "students"), where("session", "==", session));
    if (className !== "All") q = query(q, where("className", "==", className));
    q = query(q, orderBy("name", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => !s.deletedAt);
      setStudents(list);
      setLoading(false);
    });
    return () => unsub();
  }, [session, className]);

  const absentList = students.filter((s) => {
    const dayKey = `${selectedMonth}_day_${selectedDate}`;
    return s.attendance?.[selectedMonth]?.[dayKey] === "A";
  });

  return (
    <div className="p-4 md:p-8 bg-[#F8FAFC] min-h-screen font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-center mb-8 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 gap-6">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">
              Absent <span className="text-red-600">Students</span>
            </h2>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest flex items-center justify-center lg:justify-start gap-1">
              <HiOutlineCalendar className="text-blue-600"/> {selectedDate} {selectedMonth} | {session}
            </p>
          </div>
          
          {/* FILTERS */}
          <div className="flex flex-wrap justify-center gap-2 bg-slate-50 p-2 rounded-3xl border border-slate-100">
            <select value={session} onChange={(e) => setSession(e.target.value)} className="bg-white px-3 py-2 rounded-2xl font-black text-[10px] text-slate-700 outline-none border border-slate-100 cursor-pointer">
                <option value="2024-25">2024-25</option>
                <option value="2025-26">2025-26</option>
            </select>

            <div className="flex bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <select value={selectedDate} onChange={(e) => setSelectedDate(Number(e.target.value))} className="px-3 py-2 font-black text-[10px] outline-none border-r border-slate-100">
                  {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                </select>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-2 font-black text-[10px] outline-none">
                  {months.map(m => <option key={m} value={m}>{m.substring(0,3)}</option>)}
                </select>
            </div>

            <select value={className} onChange={(e) => setClassName(e.target.value)} className="bg-slate-900 text-white px-4 py-2 rounded-2xl font-black text-[10px] outline-none cursor-pointer uppercase">
              <option value="All">All Classes</option>
              {["PG", "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5"].map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-50">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-6">Student Details</th>
                  <th className="px-8 py-6">Father's Name</th>
                  <th className="px-8 py-6 text-right">Quick Call</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="3" className="p-20 text-center font-black text-slate-300 text-xs">LOADING...</td></tr>
                ) : absentList.length > 0 ? (
                  absentList.map((student) => (
                    <tr key={student.id} className="group hover:bg-slate-50/50 transition-all">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center font-black text-white shadow-lg group-hover:scale-110 transition-transform">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-black text-slate-800 uppercase text-sm leading-tight">{student.name}</div>
                            <div className="text-[9px] font-bold text-red-500 uppercase mt-0.5">{student.className} • Roll: #{student.rollNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-500 uppercase italic">
                        {student.fatherName}
                      </td>
                      <td className="px-8 py-5 text-right">
                        {/* Call Button Logic */}
                        <a 
                          href={`tel:${student.phone}`} 
                          className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-5 py-2.5 rounded-2xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all active:scale-90 shadow-sm group/btn"
                        >
                           <HiPhoneOutgoing size={16} className="group-hover/btn:animate-pulse" />
                           <span className="text-xs font-black tracking-widest uppercase">Call Now</span>
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="3" className="p-24 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic">No Absentees</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="mt-8 flex justify-center">
            <div className="bg-white px-8 py-3 rounded-full shadow-lg border border-slate-100 flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                   Total Absentees To Call: {absentList.length}
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}