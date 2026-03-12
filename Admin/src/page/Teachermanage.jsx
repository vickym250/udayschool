import React, { useEffect, useState, useMemo } from "react";
import {
  onSnapshot,
  doc,
  collection,
  getDoc,
  updateDoc,
  query,
  where
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AddTeacherPopup } from "../component/TeacherAdd";
import SalaryReceipt from "../component/SalaryReceipt";
import {
  Wallet, Users, Clock, Trash2, Printer,
  ChevronDown, Eye, CalendarDays, Edit3, UserPlus, CheckCircle2
} from "lucide-react";
import { Readdteacher } from "../component/Readdteacher";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const sessions = ["2023-24", "2024-25", "2025-26", "2026-27"];

export default function TeachersManagementPage() {
  const navigate = useNavigate();

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
  const [showAdd, setShowAdd] = useState(false);
  const [showReadd, setShowReadd] = useState(false);
  const [editTeacher, setEditTeacher] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    // Note: Agar aap Firebase Console mein Index bana lete hain, 
    // toh aap yahan query(collection(db, "teachers"), where("isDeleted", "==", false)) use kar sakte hain.
    const unsub = onSnapshot(collection(db, "teachers"), (snap) => {
      setTeachers(
        snap.docs.map((d) => ({
          id: d.id,
          attendance: d.data().attendance || {},
          salaryDetails: d.data().salaryDetails || {},
          ...d.data(),
        }))
      );
    });
    return unsub;
  }, []);

  useEffect(() => {
    const fetchHolidays = async () => {
      const holidayDocRef = doc(db, "metadata", `holidays_${currentSelectedSession}_${month}`);
      const docSnap = await getDoc(holidayDocRef);
      setHolidays(docSnap.exists() ? docSnap.data() : {});
    };
    fetchHolidays();
  }, [month, currentSelectedSession]);

  const getYearForMonth = (m, sess) => {
    const parts = sess.split("-");
    let startYear = parseInt(parts[0]);
    return months.indexOf(m) < 3 ? 2000 + parseInt(parts[1]) : startYear;
  };

  const getDaysInMonth = (m) => {
    const year = getYearForMonth(m, currentSelectedSession);
    const monthIdx = months.indexOf(m);
    return new Date(year, monthIdx + 1, 0).getDate();
  };

  const isSunday = (day, m) => {
    const year = getYearForMonth(m, currentSelectedSession);
    const monthIdx = months.indexOf(m);
    return new Date(year, monthIdx, day).getDay() === 0;
  };

  const getCalculatedData = (teacher, currentMonth) => {
    const totalDaysInMonth = getDaysInMonth(currentMonth);
    let presentCount = 0;
    let leaveCount = 0;
    let holidayCount = 0;

    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateKey = `${currentSelectedSession}_${currentMonth}_day_${i}`;
      const status = teacher.attendance?.[dateKey];
      const holidayKey = `day_${i}`;

      if (status === "P") presentCount++;
      else if (status === "L") leaveCount++;
      else if (isSunday(i, currentMonth) || holidays[holidayKey]) holidayCount++;
    }

    const monthlySalary = Number(teacher.salary) || 0;
    const perDayRate = monthlySalary / totalDaysInMonth;
    const totalPaidDays = presentCount + leaveCount + holidayCount;
    const finalPayable = Math.round(totalPaidDays * perDayRate);

    return { totalPaidDays, finalPayable };
  };

  const handleSoftDelete = async (id) => {
    if (window.confirm("Bhai, kya aap is teacher ko list se hatana chahte hain?")) {
      try {
        await updateDoc(doc(db, "teachers", id), { isDeleted: true });
        toast.success("Teacher archived successfully");
      } catch (err) {
        toast.error("Error deleting!");
      }
    }
  };

  const handleEdit = (teacher) => {
    setEditTeacher(teacher);
    setShowAdd(true);
  };

  const handleReaddClick = (teacher) => {
    setEditTeacher(teacher);
    setShowReadd(true);
  };

  // 🔥 INDEXING LOGIC: Session ke basis par teachers ko index kar rahe hain
  const indexedTeachers = useMemo(() => {
    const index = {};
    teachers.forEach(t => {
        if (!t.isDeleted) {
            if (!index[t.session]) index[t.session] = [];
            index[t.session].push(t);
        }
    });
    return index;
  }, [teachers]);

  // Seedha indexed data se current session ke teachers nikaal rahe hain
  const activeTeachers = useMemo(() => {
    return indexedTeachers[currentSelectedSession] || [];
  }, [indexedTeachers, currentSelectedSession]);

  const stats = useMemo(() => {
    return activeTeachers.reduce((acc, t) => {
      const data = getCalculatedData(t, month);
      const isPaid = Boolean(t.salaryDetails?.[currentSelectedSession]?.[month]?.paidAt);
      acc.totalPayout += data.finalPayable;
      if (isPaid) acc.paidCount++;
      else acc.pendingCount++;
      return acc;
    }, { totalPayout: 0, paidCount: 0, pendingCount: 0 });
  }, [activeTeachers, month, currentSelectedSession, holidays]);

  return (
    <div className="container mx-auto p-4 md:p-8 bg-[#F8FAFC] min-h-screen font-sans text-slate-900">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Wallet className="text-indigo-600" size={32} /> Payroll Dashboard
          </h1>
          <div className="mt-1">
            <p className="text-slate-500 font-medium text-sm">Dropdown: <span className="text-indigo-600 font-bold">{currentSelectedSession}</span> | Month: {month}</p>
            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1">Live Current Session: {REAL_TIME_SESSION}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={currentSelectedSession}
              onChange={(e) => setCurrentSelectedSession(e.target.value)}
              className="appearance-none bg-white border border-slate-200 pl-10 pr-10 py-3 rounded-2xl font-bold text-slate-700 shadow-sm outline-none focus:ring-2 ring-indigo-500 cursor-pointer"
            >
              {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <CalendarDays className="absolute left-3 top-3.5 text-slate-400 pointer-events-none" size={18} />
          </div>

          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="appearance-none bg-white border border-slate-200 pl-4 pr-10 py-3 rounded-2xl font-bold text-slate-700 shadow-sm outline-none focus:ring-2 ring-indigo-500 cursor-pointer"
            >
              {months.map((m) => <option key={m}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={20} />
          </div>

          <button onClick={() => { setEditTeacher(null); setShowAdd(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg transition-all active:scale-95">
            + Add Teacher
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="bg-indigo-100 text-indigo-600 p-4 rounded-2xl"><Users size={24} /></div>
          <div><p className="text-slate-500 text-xs font-bold uppercase">Staff Count</p><h3 className="text-2xl font-black">{activeTeachers.length}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl"><Wallet size={24} /></div>
          <div><p className="text-slate-500 text-xs font-bold uppercase">Est. Payout</p><h3 className="text-2xl font-black">₹{stats.totalPayout.toLocaleString()}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="bg-orange-100 text-orange-600 p-4 rounded-2xl"><Clock size={24} /></div>
          <div><p className="text-slate-500 text-xs font-bold uppercase">Pending</p><h3 className="text-2xl font-black">{stats.pendingCount}</h3></div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mb-12">
        {activeTeachers.length === 0 ? (
          <div className="p-20 text-center font-bold text-slate-300 uppercase tracking-widest">Is session me koi teacher nahi hai</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left">
              <tr>
                <th className="p-5">Teacher Info</th>
                <th className="p-5"> Role</th>
                <th className="p-5">Paid Days</th>
                <th className="p-5">Net Payable</th>
                <th className="p-5 text-center">Status</th>
                <th className="p-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeTeachers.map((t) => {
                const data = getCalculatedData(t, month);
                const isPaid = Boolean(t.salaryDetails?.[currentSelectedSession]?.[month]?.paidAt);
                
                const needsReAdd = t.session !== REAL_TIME_SESSION;

                // Indexing logic applied here too for fast lookup
                const isAlreadyReadded = needsReAdd && (indexedTeachers[REAL_TIME_SESSION] || []).some(
                    (other) => other.mobile === t.mobile
                );

                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black border-2 border-white shadow-sm overflow-hidden text-lg">
                          {t.photoURL ? <img src={t.photoURL} className="w-full h-full object-cover" alt="" /> : t.name?.[0]}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-800 leading-none mb-1 uppercase text-sm">{t.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{t.subject || "Teacher"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 font-bold text-slate-600 text-sm">{t.role} </td>
                    <td className="p-5 font-bold text-slate-600 text-sm">{data.totalPaidDays} Days</td>
                    <td className="p-5 font-black text-slate-900 text-lg">₹{data.finalPayable}</td>
                    <td className="p-5 text-center">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {isPaid ? "✔ Paid" : "● Unpaid"}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => navigate(`/teacherdetail/${t.id}`)} className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl hover:bg-indigo-100 shadow-sm transition-all">
                          <Eye size={18} />
                        </button>

                        {needsReAdd ? (
                          isAlreadyReadded ? (
                            <div className="bg-emerald-50 text-emerald-600 px-3 py-2 rounded-xl text-[10px] font-black flex items-center gap-1 border border-emerald-100">
                                <CheckCircle2 size={14} /> COMPLETED
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleReaddClick(t)} 
                              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-1 shadow-md hover:bg-emerald-700 transition-all active:scale-95"
                            >
                              <UserPlus size={14} /> RE-ADD
                            </button>
                          )
                        ) : (
                          <button onClick={() => handleEdit(t)} className="bg-amber-50 text-amber-600 p-2.5 rounded-xl hover:bg-amber-100 shadow-sm transition-colors">
                            <Edit3 size={18} />
                          </button>
                        )}

                        {!isPaid && !needsReAdd && (
                          <button onClick={() => navigate(`/teacherbill/${t.id}`, { state: { month, session: currentSelectedSession } })} className="bg-slate-900 text-white text-[10px] font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95">
                            Pay Now
                          </button>
                        )}

                        {isPaid && (
                          <button onClick={() => { setReceiptData({ teacher: t, month, salaryInfo: t.salaryDetails[currentSelectedSession][month] }); setShowReceipt(true); }} className="bg-white border-2 border-slate-200 text-slate-700 text-[10px] font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors">
                            <Printer size={14} /> Receipt
                          </button>
                        )}
                        <button onClick={() => handleSoftDelete(t.id)} className="text-slate-300 hover:text-rose-500 p-2 transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODALS SECTION */}
      {showAdd && <AddTeacherPopup close={() => {setShowAdd(false); setEditTeacher(null);}} editData={editTeacher} />}
      {showReadd && <Readdteacher close={() => {setShowReadd(false); setEditTeacher(null);}} teacherData={editTeacher} />}

      {showReceipt && receiptData && (
        <SalaryReceipt
          {...receiptData.teacher}
          teacherName={receiptData.teacher.name}
          month={receiptData.month}
          totalAmount={receiptData.salaryInfo.total}
          paidAmount={receiptData.salaryInfo.paid}
          paidAt={receiptData.salaryInfo.paidAt}
          receiptNo={`SAL-${receiptData.month}-${receiptData.teacher.id}`}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}