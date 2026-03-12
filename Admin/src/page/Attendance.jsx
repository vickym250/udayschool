import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  addDoc,
  serverTimestamp,
  where,
  limit
} from "firebase/firestore";
import toast from "react-hot-toast";

export default function Attendance() {
  /* ---------------- STATES ---------------- */
  const sessions = ["2024-25", "2025-26", "2026-27"];
  const [session, setSession] = useState("2025-26");
  const months = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];
  const today = new Date();
  const currentMonthName = today.toLocaleString("en-US", { month: "long" });
  const currentDay = today.getDate();

  const [month, setMonth] = useState(currentMonthName);
  const [classList, setClassList] = useState([]); 
  const [className, setClassName] = useState(""); 
  const [students, setStudents] = useState([]);
  const [limitCount, setLimitCount] = useState(10); // Sync issues fix karne ke liye limit handle ki hai
  const [hasMore, setHasMore] = useState(true); 
  const [searchTerm, setSearchTerm] = useState("");
  const [holidays, setHolidays] = useState({});
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [loading, setLoading] = useState(true); // Main Loader
  const [actionLoading, setActionLoading] = useState(false); // Button Loader

  /* ---------------- LOAD CLASSES (Dynamic) ---------------- */
  useEffect(() => {
    const q = query(collection(db, "classes"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const fetchedClasses = snap.docs.map(doc => doc.data().name || doc.id);
      setClassList(fetchedClasses);
      if (fetchedClasses.length > 0 && !className) setClassName(fetchedClasses[0]);
    });
    return () => unsub();
  }, []);

  /* ---------------- LOAD DATA (Real-time Sync Fix) ---------------- */
  useEffect(() => {
    if (!className) return; 
    setLoading(true);

    // GetDocs ki jagah onSnapshot hi use kiya hai limit ke saath taaki Load More wale students bhi sync rahein
    const q = query(
      collection(db, "students"), 
      where("session", "==", session),
      where("className", "==", className),
      orderBy("rollNumber", "asc"),
      limit(limitCount)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => !s.deletedAt);
      setStudents(data);
      setHasMore(snap.docs.length === limitCount);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [session, className, limitCount]);

  /* ---------------- LOAD MORE LOGIC ---------------- */
  const loadMoreStudents = () => {
    setLimitCount(prev => prev + 10);
  };

  /* ---------------- LOAD HOLIDAYS ---------------- */
  useEffect(() => {
    const holidayDocRef = doc(db, "metadata", `holidays_${session}_${month}`);
    const unsub = onSnapshot(holidayDocRef, (docSnap) => {
      setHolidays(docSnap.exists() ? docSnap.data() : {});
    });
    return () => unsub();
  }, [session, month]);

  /* ---------------- HELPERS (Logic Intact) ---------------- */
  const getActualYear = () => {
    const mIndex = months.indexOf(month);
    const startYear = parseInt(session.split("-")[0]);
    return mIndex >= 9 ? startYear + 1 : startYear;
  };
  const getDaysInMonth = () => {
    const actualYear = getActualYear();
    const dateObj = new Date(`${month} 1, ${actualYear}`);
    return new Date(actualYear, dateObj.getMonth() + 1, 0).getDate();
  };
  const isSunday = (day) => {
    const actualYear = getActualYear();
    return new Date(`${month} ${day}, ${actualYear}`).getDay() === 0;
  };

  /* ---------------- HOLIDAY & NOTICE LOGIC ---------------- */
  const toggleHoliday = async (day) => {
    if (isSunday(day)) return toast.error("Sunday is default holiday");
    const dayKey = `day_${day}`;
    if (holidays[dayKey]) return toast.error("Holiday already locked!");
    
    let holidayReason = prompt(`Enter Holiday Reason for Day ${day}:`);
    if (!holidayReason) return;

    try {
      const actualYear = getActualYear();
      const holidayDate = `${day} ${month} ${actualYear}`;

      await setDoc(doc(db, "metadata", `holidays_${session}_${month}`), { 
        [dayKey]: true, 
        [`${dayKey}_reason`]: holidayReason 
      }, { merge: true });

      await addDoc(collection(db, "notices"), {
        title: "Holiday Notice 🚩",
        description: `School will remain closed on ${holidayDate} for: ${holidayReason}.`,
        date: holidayDate,
        createdAt: serverTimestamp(),
        audience: "student",
        type: "holiday",
        session: session
      });

      toast.success("Holiday Locked & Notice Posted!");
    } catch (e) { toast.error("Failed!"); }
  };

  /* ---------------- ATTENDANCE LOGIC ---------------- */
  const markAttendance = async (student, day, status) => {
    if (holidays[`day_${day}`] || isSunday(day)) return toast.error("Locked!");
    const dayKey = `${month}_day_${day}`;
    const monthData = student.attendance?.[month] || {};
    const prevStatus = monthData[dayKey];
    if (prevStatus === status) return;
    
    let present = monthData.present || 0;
    let absent = monthData.absent || 0;
    if (prevStatus === "P") present--; if (prevStatus === "A") absent--;
    if (status === "P") present++; if (status === "A") absent++;

    try {
      setActionLoading(true);
      await updateDoc(doc(db, "students", student.id), {
        [`attendance.${month}.${dayKey}`]: status,
        [`attendance.${month}.present`]: present,
        [`attendance.${month}.absent`]: absent,
      });
      toast.success("Updated!");
    } catch (e) { 
      toast.error("Error!"); 
    } finally {
      setActionLoading(false);
    }
  };

  /* ---------------- PRINT LOGIC (Logic Intact) ---------------- */
  const handlePrint = () => {
    const printContent = document.getElementById("attendance-table-to-print");
    let holidayGridHTML = `<table style="width:100%; border:1px solid black; margin-top:15px; border-collapse:collapse;"><tr><th colspan="4" style="background:#f2f2f2; padding:5px; border:1px solid black; font-size:12px;">🚩 HOLIDAY DETAILS</th></tr><tr>`;
    let count = 0;
    [...Array(getDaysInMonth())].forEach((_, i) => {
      const day = i + 1;
      const dayKey = `day_${day}`;
      if (holidays[dayKey]) {
        if (count > 0 && count % 4 === 0) holidayGridHTML += `</tr><tr>`;
        holidayGridHTML += `<td style="border:1px solid black; padding:5px; font-size:10px;"><b>Day ${day}:</b> ${holidays[dayKey + "_reason"] || "Holiday"}</td>`;
        count++;
      }
    });
    holidayGridHTML += `</tr></table>`;

    const WinPrint = window.open('', '', 'width=1200,height=900');
    WinPrint.document.write(`
      <html>
        <head>
          <title>Attendance Register - ${className}</title>
          <style>
            @page { size: landscape; margin: 5mm; }
            body { font-family: sans-serif; font-size: 10px; }
            table { width: 100%; border-collapse: collapse !important; border: 1.5px solid black !important; }
            th, td { border: 1px solid black !important; padding: 3px; text-align: center; }
            .student-info { text-align: left; width: 150px; font-weight: bold; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          <h2 style="text-align:center;">Register: ${className} | ${month} ${getActualYear()}</h2>
          ${printContent.innerHTML}
          ${count > 0 ? holidayGridHTML : ""}
        </body>
      </html>
    `);
    WinPrint.document.close();
    WinPrint.focus();
    setTimeout(() => { WinPrint.print(); WinPrint.close(); }, 500);
  };

  const classStats = students.reduce((acc, student) => {
    const mData = student.attendance?.[month] || {};
    acc.totalPresent += (mData.present || 0);
    acc.totalAbsent += (mData.absent || 0);
    return acc;
  }, { totalPresent: 0, totalAbsent: 0 });

  return (
    <div className="min-h-screen bg-gray-50 px-2 py-4 sm:px-6 md:py-8" onClick={() => setActiveTooltip(null)}>
      
      {/* LOADER OVERLAY */}
      {loading && (
        <div className="fixed inset-0 z-[100] bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 font-black text-gray-700 animate-pulse">Loading Attendance Data...</p>
        </div>
      )}

      <style>{`
        #attendance-table-to-print table { border-collapse: collapse !important; border: 2px solid black !important; width: 100%; }
        #attendance-table-to-print th, #attendance-table-to-print td { border: 1px solid black !important; }
      `}</style>

      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Attendance Pro <span className="text-blue-600">({session})</span></h2>
          <button onClick={handlePrint} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">🖨️ Print Register</button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border-l-4 border-blue-600 shadow-sm border border-gray-200">
            <p className="text-xs font-bold text-gray-400 uppercase">Students Loaded</p>
            <h3 className="text-2xl font-black">{students.length}</h3>
          </div>
          <div className="bg-white p-4 rounded-2xl border-l-4 border-green-600 shadow-sm border border-gray-200">
            <p className="text-xs font-bold text-gray-400 uppercase">Total Presents</p>
            <h3 className="text-2xl font-black text-green-600">{classStats.totalPresent}</h3>
          </div>
          <div className="bg-white p-4 rounded-2xl border-l-4 border-red-600 shadow-sm border border-gray-200">
            <p className="text-xs font-bold text-gray-400 uppercase">Total Absents</p>
            <h3 className="text-2xl font-black text-red-600">{classStats.totalAbsent}</h3>
          </div>
        </div>

        {/* FILTERS */}
        <div className="grid grid-cols-2 lg:flex lg:flex-nowrap gap-3 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-300">
          <select value={session} onChange={(e) => { setSession(e.target.value); setLimitCount(10); }} className="border p-2 rounded-lg text-sm w-full outline-none">{sessions.map(s => <option key={s}>{s}</option>)}</select>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="border p-2 rounded-lg text-sm w-full outline-none">{months.map(m => <option key={m}>{m}</option>)}</select>
          <select value={className} onChange={(e) => { setClassName(e.target.value); setLimitCount(10); }} className="border p-2 rounded-lg text-sm w-full outline-none">
            {classList.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="border p-2.5 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* TABLE */}
        <div id="attendance-table-to-print" className="bg-white overflow-hidden mb-4 border-2 border-black">
          <div className="overflow-x-auto max-h-[65vh] relative">
            <table className="w-full border-separate border-spacing-0 table-fixed">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="sticky left-0 z-40 bg-slate-800 p-4 text-left w-[140px] sm:w-[200px] border-b border-white">Student Info</th>
                  {[...Array(getDaysInMonth())].map((_, i) => (
                    <th key={i} className={`p-2 text-center border-b border-r border-white w-[50px] sm:w-[55px] ${i+1 === currentDay && month === currentMonthName ? "bg-orange-500" : ""}`}>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold">{i+1}</span>
                        <button onClick={() => toggleHoliday(i+1)} className="no-print text-[9px] px-1 py-0.5 rounded bg-slate-700 font-bold">{holidays[`day_${i+1}`] || isSunday(i+1) ? "H" : "D"}</button>
                      </div>
                    </th>
                  ))}
                  <th className="p-2 text-center bg-green-700 w-[60px] sticky right-[60px] z-30 border-b border-white">P</th>
                  <th className="p-2 text-center bg-red-700 w-[60px] sticky right-0 z-30 border-b border-white">A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase())).sort((a,b) => parseInt(a.rollNumber) - parseInt(b.rollNumber)).map(student => {
                  const monthData = student.attendance?.[month] || {};
                  return (
                    <tr key={student.id} className="hover:bg-blue-50/20 group">
                      <td className="sticky left-0 z-20 bg-white p-3 font-black text-xs border-r-2 border-black group-hover:bg-blue-50">
                        {student.name}
                        <div className="text-[9px] font-normal text-gray-500">Roll: {student.rollNumber}</div>
                      </td>
                      {[...Array(getDaysInMonth())].map((_, i) => {
                        const day = i + 1;
                        const isH = holidays[`day_${day}`] || isSunday(day);
                        const status = monthData[`${month}_day_${day}`];
                        return (
                          <td key={day} className={`text-center p-1 border-r border-black ${isH ? "bg-red-50" : ""}`}>
                            {!isH ? (
                              <div className="flex flex-col gap-1 items-center no-print">
                                <button disabled={actionLoading} onClick={() => markAttendance(student, day, "P")} className={`w-8 h-6 text-[9px] font-black rounded border ${status === "P" ? "bg-green-600 text-white" : "bg-white"} transition-all disabled:opacity-50`}>P</button>
                                <button disabled={actionLoading} onClick={() => markAttendance(student, day, "A")} className={`w-8 h-6 text-[9px] font-black rounded border ${status === "A" ? "bg-red-600 text-white" : "bg-white"} transition-all disabled:opacity-50`}>A</button>
                              </div>
                            ) : ( <span className="text-[10px] text-red-500 font-black">H</span> )}
                            <span className="hidden print:block font-black text-xs">{status || "-"}</span>
                          </td>
                        );
                      })}
                      <td className="text-center font-black bg-green-50 sticky right-[60px] border-l-2 border-black">{monthData.present || 0}</td>
                      <td className="text-center font-black bg-red-50 sticky right-0 border-l-2 border-black">{monthData.absent || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* LOAD MORE */}
        {hasMore && (
          <div className="flex justify-center mt-6">
            <button onClick={loadMoreStudents} className="bg-black text-white px-10 py-2.5 rounded-full font-black text-sm shadow-lg active:scale-95 transition-all hover:bg-gray-800">⬇️ LOAD NEXT 10 STUDENTS</button>
          </div>
        )}
      </div>
    </div>
  );
}