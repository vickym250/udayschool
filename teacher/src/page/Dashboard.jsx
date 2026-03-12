import React, { useEffect, useState } from "react";
import { 
  User, 
  CalendarCheck, 
  Users, 
  ClipboardList, 
  Trophy, 
  Newspaper, 
  Bell,
  LogOut,
  IndianRupee,
  FileText,
  ClipboardCheck
} from "lucide-react";
import { doc, onSnapshot, collection, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase"; 
import { useNavigate } from "react-router-dom";

/* ---------- TIME CHECKER HELPER ---------- */
const isWithinTime = (firebaseTimestamp, hours) => {
  if (!firebaseTimestamp) return false;
  const now = new Date().getTime();
  const itemDate = firebaseTimestamp.toDate ? firebaseTimestamp.toDate().getTime() : new Date(firebaseTimestamp).getTime();
  const diffInHours = (now - itemDate) / (1000 * 60 * 60);
  return diffInHours <= hours;
};

export default function DashboardWeb() {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [latestNotice, setLatestNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check Login from localStorage
    const saved = localStorage.getItem("teacher");
    if (!saved) {
      navigate("/login");
      return;
    }
    const t = JSON.parse(saved);
    
    // 2. Real-time Teacher Profile
    const unsubTeacher = onSnapshot(doc(db, "teachers", t.id), (snap) => {
      if (snap.exists()) {
        setTeacher({ id: snap.id, ...snap.data() });
        setLoading(false);
      }
    });

    // 3. Real-time Latest Notice (24h filter)
    const qNotice = query(collection(db, "notices"), orderBy("date", "desc"), limit(1));
    const unsubNotice = onSnapshot(qNotice, (snap) => {
      if (!snap.empty) {
        const noticeData = snap.docs[0].data();
        if (isWithinTime(noticeData.date, 24)) {
          setLatestNotice(noticeData);
        } else {
          setLatestNotice(null);
        }
      }
    });

    return () => {
      unsubTeacher();
      unsubNotice();
    };
  }, [navigate]);

  if (loading || !teacher) {
    return (
      <div className="flex h-screen items-center justify-center bg-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  // 🔥 MERGED MENU ITEMS (Aapke purane React Native features ke saath)
  const menuItems = [
    { title: "My Attendance", icon: <CalendarCheck size={28}/>, color: "text-blue-600", path: "/my-attendance" },
    { title: "Student Attendance", icon: <Users size={28}/>, color: "text-indigo-600", path: "/student-attendance" },
    { title: "Homework", icon: <ClipboardList size={28}/>, color: "text-emerald-600", path: "/homework" },
    { title: "Add Test", icon: <Newspaper size={28}/>, color: "text-cyan-600", path: "/add-test" },
    { title: "Test Results", icon: <ClipboardCheck size={28}/>, color: "text-rose-500", path: "/test-results" },
    { title: "Exam Papers", icon: <FileText size={28}/>, color: "text-orange-500", path: "/exam-papers" },
    { title: "Final Results", icon: <Trophy size={28}/>, color: "text-amber-500", path: "/final-result" },
    { title: "My Salary", icon: <IndianRupee size={28}/>, color: "text-green-600", path: "/my-salary" },
    { title: "Profile", icon: <User size={28}/>, color: "text-slate-600", path: "/profile" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* PROFILE SECTION */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6 mb-8">
          <img 
            src={teacher.photoURL || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
            alt="Profile" 
            className="w-24 h-24 rounded-full object-cover border-4 border-blue-100 shadow-sm"
          />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-black text-slate-800 italic uppercase tracking-tight">{teacher.name}</h1>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">{teacher.subject} Teacher • {teacher.role}</p>
            <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-3">
               <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-black italic border border-blue-100">📞 {teacher.phone}</span>
               {teacher.lastAttendanceDate && isWithinTime(teacher.lastAttendanceDate, 12) && (
                 <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs font-black border border-green-100">✓ PRESENT TODAY</span>
               )}
            </div>
          </div>
          <button 
            onClick={() => { localStorage.clear(); navigate("/login"); }}
            className="bg-slate-50 p-4 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-slate-100"
          >
            <LogOut size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* MAIN MENU GRID */}
          <div className="lg:col-span-8">
            <h2 className="text-xl font-black text-slate-800 uppercase italic mb-6 flex items-center gap-2">
              <ClipboardCheck size={24} className="text-blue-600" /> Quick Actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {menuItems.map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => navigate(item.path)}
                  className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:scale-105 transition-all flex flex-col items-center gap-3 group border-b-4 hover:border-blue-500"
                >
                  <div className={`${item.color} group-hover:scale-110 transition-transform duration-300`}>
                    {item.icon}
                  </div>
                  <span className="font-black text-slate-700 uppercase italic text-[10px] tracking-widest text-center">{item.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* NOTICE SECTION */}
          <div className="lg:col-span-4">
             <h2 className="text-xl font-black text-slate-800 uppercase italic mb-6 flex items-center gap-2">
               <Bell size={24} className="text-red-500" /> Notifications
             </h2>
             {latestNotice ? (
               <div className="bg-white p-6 rounded-[2.5rem] border-l-[12px] border-red-500 shadow-lg relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-2 opacity-10">
                   <Bell size={60} />
                 </div>
                 <h3 className="font-black text-slate-800 uppercase text-sm mb-2 relative z-10">{latestNotice.title}</h3>
                 <p className="text-slate-500 text-xs font-bold leading-relaxed mb-4 relative z-10">{latestNotice.description}</p>
                 <div className="text-[10px] text-slate-300 font-black italic flex justify-between items-center relative z-10">
                   <span>SCHOOL NOTICE</span>
                   <span>{latestNotice.date?.toDate ? latestNotice.date.toDate().toLocaleDateString("en-GB") : "RECENT"}</span>
                 </div>
               </div>
             ) : (
               <div className="bg-slate-100 p-10 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
                 <p className="text-slate-400 font-bold text-xs uppercase tracking-tighter italic">No Recent Notices</p>
               </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}