import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { 
  HiUserGroup, HiCheckCircle, HiXCircle, HiCurrencyRupee, 
  HiChevronLeft, HiChevronRight, HiCalendar, HiClipboardCheck,
  HiExclamationCircle, HiClock, HiTrendingUp
} from "react-icons/hi";

export default function Dashboard() {
  const [students, setStudents] = useState([]);
  const [feesData, setFeesData] = useState([]);
  const [dynamicClasses, setDynamicClasses] = useState([]); 
  const [selectedSession, setSelectedSession] = useState("2025-26");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const currentDay = selectedDate.getDate();
  const currentMonth = selectedDate.toLocaleString('en-US', { month: 'short' });

  // 1. DATA FETCHING WITH 'WHERE' CLAUSE
  useEffect(() => {
    // A. Fetch All Classes (For Table Rows)
    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      const cList = snap.docs.map(d => d.data().className || d.data().name || d.id);
      const sorted = cList.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      setDynamicClasses(sorted);
    });

    // B. Fetch Students - ONLY for the Selected Session (Optimization using WHERE)
    const studentQuery = query(
      collection(db, "students"),
      where("session", "==", selectedSession)
    );

    const unsubStudents = onSnapshot(studentQuery, (snap) => {
      // Frontend par filter kam karna padega ab
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => !s.deletedAt); // deleted students hata diye
      setStudents(list);
    });

    // C. Fetch Fees - Global collection
    const unsubFees = onSnapshot(collection(db, "feesManage"), (snap) => {
      setFeesData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubClasses(); unsubStudents(); unsubFees(); };
  }, [selectedSession]); // Session badalne par useEffect firse chalega aur 'where' query update hogi

  // 2. CALCULATIONS (useMemo for Speed)
  const classWiseReport = useMemo(() => {
    return dynamicClasses.map(cls => {
      const classStudents = students.filter(s => s.className === cls);
      const studentIds = classStudents.map(s => s.id);
      const dayKey = `day_${currentDay}`;
      
      let present = 0, absent = 0, classCollection = 0, classPending = 0;
      const paidStudentIds = new Set();

      classStudents.forEach(s => {
        const status = s.attendance?.[selectedSession]?.[currentMonth]?.[dayKey]?.status;
        if (status === "P") present++;
        else if (status === "A") absent++;
        classPending += Number(s.balance || 0);
      });

      feesData.forEach(doc => {
        if (studentIds.includes(doc.studentId)) {
          doc.history?.forEach(entry => {
            if (entry.session === selectedSession && Number(entry.received) > 0) {
              classCollection += Number(entry.received);
              paidStudentIds.add(doc.studentId);
            }
          });
        }
      });

      return {
        className: cls,
        total: classStudents.length,
        present,
        absent,
        fees: classCollection,
        pending: classPending,
        paidCount: paidStudentIds.size
      };
    });
  }, [students, feesData, dynamicClasses, selectedSession, currentDay, currentMonth]);

  const totals = useMemo(() => {
    return classWiseReport.reduce((acc, curr) => ({
      total: acc.total + curr.total,
      present: acc.present + curr.present,
      absent: acc.absent + curr.absent,
      fees: acc.fees + curr.fees,
      pending: acc.pending + curr.pending,
      paidCount: acc.paidCount + curr.paidCount
    }), { total: 0, present: 0, absent: 0, fees: 0, pending: 0, paidCount: 0 });
  }, [classWiseReport]);

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER SECTION */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl mb-10 border border-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <HiTrendingUp size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 uppercase italic">
                School <span className="text-blue-600">Pro</span> Dashboard
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">
                Session Active: {selectedSession}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200">
               <button onClick={() => changeDate(-1)} className="p-2.5 hover:bg-white rounded-xl text-slate-500"><HiChevronLeft size={22}/></button>
               <input 
                  type="date" 
                  className="bg-transparent text-[11px] font-black uppercase text-slate-700 px-3 outline-none cursor-pointer"
                  value={selectedDate.toISOString().split('T')[0]} 
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
               />
               <button onClick={() => changeDate(1)} className="p-2.5 hover:bg-white rounded-xl text-slate-500"><HiChevronRight size={22}/></button>
            </div>

            <select 
              value={selectedSession} 
              onChange={(e) => setSelectedSession(e.target.value)}
              className="px-6 py-3.5 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-lg cursor-pointer hover:bg-blue-600 transition-all border-none"
            >
              <option value="2024-25">2024-25</option>
              <option value="2025-26">2025-26</option>
              <option value="2026-27">2026-27</option>
            </select>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-10">
          <StatCard title="Strength" value={totals.total} icon={<HiUserGroup/>} color="bg-blue-600" sub="Students" />
          <StatCard title="Present" value={totals.present} icon={<HiCheckCircle/>} color="bg-emerald-500" sub="Today" />
          <StatCard title="Absent" value={totals.absent} icon={<HiXCircle/>} color="bg-rose-500" sub="Today" />
          <StatCard title="Paid Count" value={totals.paidCount} icon={<HiClipboardCheck/>} color="bg-indigo-600" sub="Fees Done" />
          <StatCard title="Collection" value={`₹${totals.fees.toLocaleString()}`} icon={<HiCurrencyRupee/>} color="bg-orange-500" sub="Received" />
          <StatCard title="Pending" value={`₹${totals.pending.toLocaleString()}`} icon={<HiClock/>} color="bg-red-600" sub="Due Amount" />
        </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-[3rem] shadow-2xl border border-white overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30">
             <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span> 
                Class Wise Financial Report
             </h3>
          </div>
          
          <div className="overflow-x-auto px-6 pb-8">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-6">Class Name</th>
                  <th className="p-6 text-center">Students</th>
                  <th className="p-6 text-center">Paid Students</th>
                  <th className="p-6 text-right">Dues</th>
                  <th className="p-6 text-right">Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {classWiseReport.map((row, index) => (
                  <tr key={row.className} className="hover:bg-blue-50/40 transition-all group">
                    <td className="p-6 flex items-center gap-4">
                        <span className="text-[10px] font-bold text-slate-300">{(index+1).toString().padStart(2,'0')}</span>
                        <span className="font-black text-slate-700 text-sm group-hover:text-blue-600 transition-colors uppercase italic">{row.className}</span>
                    </td>
                    <td className="p-6 text-center font-black text-slate-500">{row.total}</td>
                    <td className="p-6 text-center">
                      <div className="inline-flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full text-indigo-600 font-black text-xs">
                        {row.paidCount} <span className="text-[8px] uppercase tracking-tighter">Paid</span>
                      </div>
                    </td>
                    <td className="p-6 text-right font-black text-rose-500">₹{row.pending.toLocaleString()}</td>
                    <td className="p-6 text-right font-black text-slate-800">₹{row.fees.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] flex items-center justify-center gap-2">
               <HiExclamationCircle size={14}/> Querying Firestore with Session Filter: {selectedSession}
            </p>
        </div>

      </div>
    </div>
  );
}

const StatCard = ({ title, value, icon, color, sub }) => (
  <div className="bg-white p-5 rounded-[2.2rem] shadow-lg border border-white flex items-center gap-4 hover:shadow-2xl transition-all">
    <div className={`w-11 h-11 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0`}>
      <span className="text-xl">{icon}</span>
    </div>
    <div className="min-w-0">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{title}</p>
      <p className="text-lg font-black text-slate-800 tracking-tighter truncate">{value}</p>
      <p className="text-[8px] font-bold text-slate-400 uppercase italic">{sub}</p>
    </div>
  </div>
);