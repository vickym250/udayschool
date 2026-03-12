import React, { useEffect, useState, useMemo } from "react";
import { db } from "../firebase";
import { 
  collection, 
  doc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy,
  setDoc,
  getDoc
} from "firebase/firestore";
import toast from "react-hot-toast";
import { UserCheck, ChevronRight, Lock, CalendarDays } from "lucide-react"; 

export default function TeacherAttendance() {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const sessions = ["2023-24", "2024-25", "2025-26", "2026-27"];

  // --- 🔥 Session Logic ---
  const getRealTimeSession = () => {
    const now = new Date();
    const currentMonth = now.getMonth(); 
    const currentYear = now.getFullYear();
    let startYear = currentMonth <= 2 ? currentYear - 1 : currentYear;
    const endYearShort = (startYear + 1).toString().slice(-2);
    return `${startYear}-${endYearShort}`;
  };

  const REAL_TIME_SESSION = getRealTimeSession();

  const [month, setMonth] = useState(months[new Date().getMonth()]);
  const [currentSelectedSession, setCurrentSelectedSession] = useState(REAL_TIME_SESSION);
  const [teachers, setTeachers] = useState([]);
  const [holidays, setHolidays] = useState({});
  const [activeTooltip, setActiveTooltip] = useState(null);

  const todayDate = new Date().getDate();
  const currentMonthName = months[new Date().getMonth()];

  // 1. Fetch Teachers
  useEffect(() => {
    const q = query(collection(db, "teachers"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTeachers(list);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Holidays with Session
  useEffect(() => {
    // Holiday key mein session add kiya taaki har saal ki holidays alag rahein
    const holidayDocRef = doc(db, "metadata", `teacher_holidays_${currentSelectedSession}_${month}`);
    const unsubHolidays = onSnapshot(holidayDocRef, (docSnap) => {
      setHolidays(docSnap.exists() ? docSnap.data() : {});
    });
    return () => unsubHolidays();
  }, [month, currentSelectedSession]);

  const getDaysInMonth = () => {
    const m = months.indexOf(month);
    // Session se year nikalne ka logic
    const parts = currentSelectedSession.split("-");
    const year = m < 3 ? 2000 + parseInt(parts[1]) : parseInt(parts[0]);
    return new Date(year, m + 1, 0).getDate();
  };

  const isSunday = (day) => {
    const m = months.indexOf(month);
    const parts = currentSelectedSession.split("-");
    const year = m < 3 ? 2000 + parseInt(parts[1]) : parseInt(parts[0]);
    return new Date(year, m, day).getDay() === 0;
  };

  const toggleHoliday = async (day) => {
    if (isSunday(day)) return toast.error("Sunday is default holiday");
    const dayKey = `day_${day}`;
    if (holidays[dayKey]) {
      toast.error("Holiday is already locked!");
      return;
    }

    let holidayReason = prompt(`Enter Holiday Reason for Day ${day}:`);
    if (!holidayReason) return;

    try {
      await setDoc(doc(db, "metadata", `teacher_holidays_${currentSelectedSession}_${month}`), { 
        [dayKey]: true, [`${dayKey}_reason`]: holidayReason 
      }, { merge: true });
      toast.success("Locked!");
    } catch (e) { toast.error("Error!"); }
  };

  const markAttendance = async (teacher, day, status) => {
    if (holidays[`day_${day}`] || isSunday(day)) {
      toast.error("Day is Locked!");
      return;
    }

    // 🔥 Key mein Session add kiya (e.g. "2024-25_January_day_1")
    const dateKey = `${currentSelectedSession}_${month}_day_${day}`;
    const reasonKey = `${currentSelectedSession}_${month}_day_${day}_reason`;

    if (teacher.attendance?.[dateKey] && status !== "") {
      toast.error("Attendance is locked!");
      return;
    }

    let leaveReason = "";
    if (status === "L") {
      leaveReason = prompt("Enter Leave Reason:");
      if (leaveReason === null) return;
    }
    
    try {
      await updateDoc(doc(db, "teachers", teacher.id), {
        [`attendance.${dateKey}`]: status,
        [`attendance.${reasonKey}`]: leaveReason,
      });
      toast.success(`Marked ${status}`);
    } catch (err) {
      toast.error("Error updating");
    }
  };

  // 🔥 FILTER LOGIC: Sirf wahi teachers jo deleted nahi hain AUR selected session ke hain
  const activeTeachers = useMemo(() => {
    return teachers.filter(t => !t.isDeleted && t.session === currentSelectedSession);
  }, [teachers, currentSelectedSession]);

  return (
    <div className="container mx-auto rounded-2xl shadow-xl overflow-hidden" onClick={() => setActiveTooltip(null)}>
      <div className="w-full relative">
        
        {/* HEADER */}
        <div className="flex-none bg-white p-3 md:p-5 rounded-xl shadow-sm border mb-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-blue-600 p-2 rounded-lg text-white shrink-0">
              <UserCheck size={20} />
            </div>
            <div>
               <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">Teacher Attendance</h2>
               <p className="text-[10px] text-blue-600 font-bold uppercase">Live: {REAL_TIME_SESSION}</p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
            {/* Session Selector */}
            <div className="relative">
                <select
                value={currentSelectedSession}
                onChange={(e) => setCurrentSelectedSession(e.target.value)}
                className="appearance-none border-2 pl-8 pr-4 py-1.5 rounded-lg bg-white font-bold text-slate-700 outline-none text-sm focus:border-blue-500 transition-all cursor-pointer"
                >
                {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <CalendarDays className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
            </div>

            {/* Month Selector */}
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border-2 px-3 py-1.5 rounded-lg bg-white font-bold text-slate-700 outline-none text-sm focus:border-blue-500 transition-all cursor-pointer"
            >
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* TABLE AREA */}
        <div className="flex-1 min-h-0 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col relative">
          <div className="overflow-auto relative grow scrollbar-hide">
            {activeTeachers.length === 0 ? (
                <div className="p-20 text-center font-bold text-slate-300 uppercase">Is session mein koi teacher nahi hai</div>
            ) : (
                <table className="w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-30 shadow-sm">
                    <tr className="bg-slate-50">
                    <th className="p-3 text-left border-b border-r sticky top-0 left-0 bg-slate-50 z-40 min-w-[130px] sm:min-w-[180px] text-slate-600 font-bold text-[10px] md:text-xs uppercase tracking-wider">
                        Teacher Name
                    </th>
                    {[...Array(getDaysInMonth())].map((_, i) => {
                        const day = i + 1;
                        const sun = isSunday(day);
                        const isH = holidays[`day_${day}`] || sun;
                        const isToday = day === todayDate && month === currentMonthName && currentSelectedSession === REAL_TIME_SESSION;

                        return (
                        <th key={i} className={`p-2 border-b border-r text-center sticky top-0 z-20 min-w-[42px] ${sun ? 'bg-red-50' : isToday ? 'bg-indigo-100 ring-2 ring-inset ring-indigo-500' : 'bg-slate-50'}`}>
                            <span className={`text-[10px] font-black block ${isToday ? 'text-indigo-700' : 'text-slate-500'}`}>{day}</span>
                            <button 
                            onClick={() => toggleHoliday(day)}
                            className={`mt-1 text-[8px] px-1 rounded border leading-tight transition-all active:scale-95 ${sun ? 'bg-red-600 text-white border-red-700' : isH ? 'bg-red-500 text-white border-red-600' : 'bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-300'}`}
                            >
                            {sun ? 'S' : isH ? 'H' : 'D'}
                            </button>
                        </th>
                        )
                    })}
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                    {activeTeachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-2 md:p-3 border-r sticky left-0 bg-white z-20 flex items-center gap-2 shadow-[2px_0_5px_rgba(0,0,0,0.05)] font-bold text-slate-700 text-[10px] md:text-xs">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-100 border shrink-0 flex items-center justify-center font-bold text-blue-500 overflow-hidden">
                            {teacher.photoURL ? <img src={teacher.photoURL} className="w-full h-full object-cover" alt="t" /> : teacher.name?.[0]}
                        </div>
                        <span className="truncate">{teacher.name}</span>
                        </td>

                        {[...Array(getDaysInMonth())].map((_, i) => {
                        const day = i + 1;
                        const sun = isSunday(day);
                        const isH = holidays[`day_${day}`] || sun;
                        const dateKey = `${currentSelectedSession}_${month}_day_${day}`;
                        const status = teacher.attendance?.[dateKey] || "";
                        const reason = teacher.attendance?.[`${dateKey}_reason`] || "";
                        const tooltipKey = `${teacher.id}_${day}`;
                        const isToday = day === todayDate && month === currentMonthName && currentSelectedSession === REAL_TIME_SESSION;

                        return (
                            <td 
                            key={i} 
                            className={`p-1 border-r text-center h-10 md:h-12 min-w-[45px] relative group/cell ${isH ? 'bg-red-50/50' : isToday ? 'bg-indigo-50/50' : ''}`}
                            >
                            {isH ? (
                                <span className="text-[8px] font-black rotate-[-90deg] block text-red-400">HOLIDAY</span>
                            ) : status ? (
                                <div 
                                onMouseEnter={() => reason && setActiveTooltip(tooltipKey)} 
                                onMouseLeave={() => setActiveTooltip(null)}
                                className="w-full h-full relative flex items-center justify-center"
                                >
                                <button 
                                    className={`w-full h-7 md:h-8 flex items-center justify-center gap-1 rounded font-black text-white text-[9px] md:text-[10px] shadow-sm
                                    ${status === 'P' ? 'bg-green-500' : status === 'A' ? 'bg-red-500' : 'bg-amber-500'}`}
                                >
                                    {status}
                                    <Lock size={8} className="opacity-70" />
                                </button>

                                {activeTooltip === tooltipKey && reason && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[999]">
                                    <div className="bg-slate-900 text-white text-[9px] py-1.5 px-2.5 rounded shadow-2xl min-w-[120px] text-center border border-slate-700">
                                        <div className="text-amber-400 font-bold border-b border-slate-700 mb-1 pb-0.5 uppercase">Remark</div>
                                        <div className="italic font-medium text-slate-100 leading-tight">"{reason}"</div>
                                    </div>
                                    </div>
                                )}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-0.5 items-center justify-center">
                                <div className="flex gap-0.5">
                                    <button onClick={() => markAttendance(teacher, day, "P")} className="w-4 h-4 md:w-5 md:h-5 text-[7px] md:text-[9px] font-bold rounded bg-slate-100 text-slate-400 hover:bg-green-500 hover:text-white transition-all">P</button>
                                    <button onClick={() => markAttendance(teacher, day, "A")} className="w-4 h-4 md:w-5 md:h-5 text-[7px] md:text-[9px] font-bold rounded bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white transition-all">A</button>
                                </div>
                                <button onClick={() => markAttendance(teacher, day, "L")} className="w-8.5 h-3.5 md:w-10.5 md:h-4 text-[7px] md:text-[8px] font-bold rounded bg-slate-100 text-slate-400 hover:bg-amber-500 hover:text-white transition-all">LEAVE</button>
                                </div>
                            )}
                            </td>
                        );
                        })}
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex-none p-3 flex flex-wrap gap-x-4 gap-y-2 justify-center items-center text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white mt-2 rounded-lg border shadow-sm">
           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-green-500 rounded-sm"></div><span>Present</span></div>
           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-red-500 rounded-sm"></div><span>Absent</span></div>
           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></div><span>Leave</span></div>
           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-indigo-200 rounded-sm border border-indigo-400"></div><span className="text-indigo-500">Today</span></div>
           <div className="hidden sm:block text-slate-300">|</div>
           <div className="flex items-center gap-1 text-slate-400 font-normal italic lowercase"><ChevronRight size={10} /> Data is filtered by session. Attendance is locked once marked.</div>
        </div>

      </div>
    </div>
  );
}