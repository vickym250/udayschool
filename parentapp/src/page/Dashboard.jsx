import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot, orderBy, doc, where, getDocs, limit } from "firebase/firestore";
import { 
  Bell, Languages, GraduationCap, CalendarCheck, BookOpen, 
  Wallet, User, FileText, Volume2, X, ClipboardList, Clock 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const translations = {
  en: { 
    dashboard: "Dashboard", attendance: "Attendance", homework: "Homework", 
    marks: "Result", fees: "Fees", profile: "Profile", application: "Application",
    notifications: "Notifications", noNotif: "All caught up!", 
    feeUpdate: "Fee Received", present: "Present ✅", absent: "Absent ❌",
    vPresent: "is Present today.", vAbsent: "is Absent today." 
  },
  hi: { 
    dashboard: "डैशबोर्ड", attendance: "उपस्थिति", homework: "होमवर्क", 
    marks: "परिणाम", fees: "फीस", profile: "प्रोफ़ाइल", application: "प्रार्थना पत्र",
    notifications: "सूचनाएं", noNotif: "कोई नई सूचना नहीं", 
    feeUpdate: "फीस प्राप्त हुई", present: "उपस्थित ✅", absent: "अनुपस्थित ❌",
    vPresent: "आज उपस्थित है।", vAbsent: "आज अनुपस्थित है।" 
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [lang, setLang] = useState(localStorage.getItem("appLang") || "en");
  const [liveStudent, setLiveStudent] = useState(null);
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [parentStudents, setParentStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Notification States
  const [showNotif, setShowNotif] = useState(false);
  const [allNotifs, setAllNotifs] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);

  const t = translations[lang];

  // Session Calculation
  const getSession = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 4 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
  };
  const currentSession = getSession();

  // 1. Initial Setup: Fetch Siblings
  useEffect(() => {
    const pid = localStorage.getItem("parentId");
    if (!pid) { navigate("/login"); return; }

    const fetchSiblings = async () => {
      try {
        const q = query(collection(db, "students"), where("parentId", "==", pid), where("session", "==", currentSession));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => !s.deletedAt);
        setParentStudents(list);
        if (list.length > 0) setActiveStudentId(list[0].id);
        else setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    fetchSiblings();
  }, [navigate, currentSession]);

  // 2. Real-time Listeners for Notifications
  useEffect(() => {
    if (!activeStudentId) return;

    // A. Student Data Sync
    const unsubStudent = onSnapshot(doc(db, "students", activeStudentId), (snap) => {
      if (snap.exists()) setLiveStudent({ id: snap.id, ...snap.data() });
      setLoading(false);
    });

    // B. Fees Sync (From feesManage)
    const unsubFees = onSnapshot(doc(db, "feesManage", activeStudentId), (snap) => {
      if (snap.exists()) {
        const history = snap.data().history || [];
        const feeItems = history.slice(-3).reverse().map(txn => ({
          id: `fee-${txn.paidAt}`,
          type: 'Fee',
          title: `${t.feeUpdate}: ₹${txn.received}`,
          desc: `Months: ${txn.months?.join(", ") || "School Fee"}`,
          time: new Date(txn.paidAt),
          icon: <Wallet size={16} />,
          color: 'text-green-600', bg: 'bg-green-50'
        }));
        updateMasterList(feeItems, 'fees');
      }
    });

    // C. Homework Sync
    const hwQ = query(collection(db, "homework"), where("className", "==", liveStudent?.className || ""), limit(5));
    const unsubHw = onSnapshot(hwQ, (snap) => {
      const hwItems = snap.docs.map(d => ({
        id: d.id,
        type: 'Homework',
        title: d.data().title,
        desc: d.data().subject,
        time: d.data().createdAt?.toDate() || new Date(),
        icon: <BookOpen size={16} />,
        color: 'text-purple-600', bg: 'bg-purple-50'
      }));
      updateMasterList(hwItems, 'hw');
    });

    // D. Notice Sync
    const noticeQ = query(collection(db, "notices"), orderBy("createdAt", "desc"), limit(5));
    const unsubNotice = onSnapshot(noticeQ, (snap) => {
      const noticeItems = snap.docs.map(d => ({
        id: d.id,
        type: 'Notice',
        title: d.data().title,
        desc: d.data().description,
        time: d.data().createdAt?.toDate() || new Date(),
        icon: <Bell size={16} />,
        color: 'text-amber-600', bg: 'bg-amber-50'
      }));
      updateMasterList(noticeItems, 'notice');
    });

    // Merge logic
    let tempStore = { fees: [], hw: [], notice: [] };
    const updateMasterList = (data, cat) => {
      tempStore[cat] = data;
      const combined = [...tempStore.fees, ...tempStore.hw, ...tempStore.notice]
        .sort((a, b) => b.time - a.time);
      setAllNotifs(combined);

      // Dot Logic
      const lastSeen = localStorage.getItem("lastSeenNotif") || 0;
      if (combined.length > 0 && combined[0].time?.getTime() > lastSeen) {
        setHasUnread(true);
      }
    };

    return () => { unsubStudent(); unsubFees(); unsubHw(); unsubNotice(); };
  }, [activeStudentId, liveStudent?.className]);

  const handleOpenNotif = () => {
    setShowNotif(true);
    setHasUnread(false);
    localStorage.setItem("lastSeenNotif", Date.now());
  };

  const getTodayStatus = () => {
    if (!liveStudent?.attendance) return null;
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "long" });
    const dayKey = `${month}_day_${now.getDate()}`;
    return liveStudent.attendance?.[month]?.[dayKey] || null;
  };

  const announceStatus = () => {
    const status = getTodayStatus();
    let msg = `${liveStudent.name} ${status === "P" ? t.vPresent : status === "A" ? t.vAbsent : ""}`;
    const utterance = new SpeechSynthesisUtterance(msg);
    utterance.lang = lang === "en" ? "en-US" : "hi-IN";
    window.speechSynthesis.speak(utterance);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 font-sans max-w-md mx-auto relative">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-blue-900 leading-none">{t.dashboard}</h1>
        <div className="flex gap-2">
          {/* Bell Icon with Count & Badge */}
          <button onClick={handleOpenNotif} className="bg-white p-2.5 rounded-2xl text-blue-600 shadow-sm border border-slate-100 relative active:scale-90 transition-all">
            <Bell size={22} fill={hasUnread ? "#2563eb" : "none"} className={hasUnread ? "animate-swing" : ""} />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
                {allNotifs.length}
              </span>
            )}
          </button>
          <button onClick={() => {
            const nl = lang === "en" ? "hi" : "en";
            setLang(nl);
            localStorage.setItem("appLang", nl);
          }} className="bg-blue-600 text-white px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold">
            <Languages size={16} /> {lang === "en" ? "हिन्दी" : "English"}
          </button>
        </div>
      </div>

      {/* Sibling Tabs */}
      {parentStudents.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
          {parentStudents.map(s => (
            <button key={s.id} onClick={() => setActiveStudentId(s.id)} className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${activeStudentId === s.id ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-slate-500"}`}>
              {s.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Profile Card */}
      {liveStudent && (
        <div className="bg-white p-5 rounded-[32px] shadow-sm flex items-center mb-8 border border-slate-100">
          <img src={liveStudent.photoURL || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} className="w-16 h-16 rounded-2xl border-2 border-blue-50 object-cover" alt="p" />
          <div className="ml-4">
            <h2 className="text-lg font-black text-blue-900 leading-tight">{liveStudent.name}</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Class: {liveStudent.className} | Roll: {liveStudent.rollNumber}</p>
          </div>
        </div>
      )}

      {/* Attendance Quick View */}
      {getTodayStatus() && (
        <div className={`mb-6 p-4 rounded-[24px] flex items-center justify-between border-b-4 ${getTodayStatus() === 'P' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'}`}>
          <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest">
            <CalendarCheck size={18} /> Today's Attendance
          </div>
          <span className="font-black text-sm">{getTodayStatus() === 'P' ? t.present : t.absent}</span>
        </div>
      )}

      {/* Menu Grid */}
      <div className="grid grid-cols-2 gap-4">
        <MenuCard title={t.attendance} icon={<CalendarCheck size={24}/>} color="bg-blue-50 text-blue-600" onClick={() => navigate(`/attendance/${activeStudentId}`)} />
        <MenuCard title={t.homework} icon={<BookOpen size={24}/>} color="bg-purple-50 text-purple-600" onClick={() => navigate(`/homework/${liveStudent?.className}`)} />
        <MenuCard title={t.marks} icon={<FileText size={24}/>} color="bg-green-50 text-green-600" onClick={() => navigate(`/marks`, {state: {student: liveStudent}})} />
        <MenuCard title={t.fees} icon={<Wallet size={24}/>} color="bg-orange-50 text-orange-600" onClick={() => navigate(`/fees`, {state: {student: liveStudent}})} />
        <MenuCard title={t.profile} icon={<User size={24}/>} color="bg-indigo-50 text-indigo-600" onClick={() => navigate(`/profile`)} />
        <MenuCard title={t.application} icon={<ClipboardList size={24}/>} color="bg-pink-50 text-pink-600" onClick={() => navigate(`/application`)} />
      </div>

      {/* Floating Speak Button */}
      <button onClick={announceStatus} className="fixed bottom-6 right-6 bg-blue-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-40">
        <Volume2 size={28} />
      </button>

      {/* NOTIFICATION OVERLAY */}
      {showNotif && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-6 pb-12 animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-blue-900">{t.notifications} ({allNotifs.length})</h3>
              <button onClick={() => setShowNotif(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20}/></button>
            </div>

            <div className="space-y-4 overflow-y-auto no-scrollbar flex-1 pb-10">
              {allNotifs.map((n) => (
                <div key={n.id} className="p-4 rounded-[28px] bg-slate-50 border border-slate-100 flex gap-4 items-start relative">
                  <div className={`${n.bg} ${n.color} p-3 rounded-2xl shadow-sm`}>{n.icon}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${n.color}`}>{n.type}</span>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock size={10} />
                        <span className="text-[10px] font-bold">{n.time.toLocaleDateString('en-IN', {day: '2-digit', month: 'short'})}</span>
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{n.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.desc}</p>
                  </div>
                </div>
              ))}
              {allNotifs.length === 0 && <p className="text-center py-20 text-slate-400 font-bold italic">{t.noNotif}</p>}
            </div>
          </div>
        </div>
      )}
      <p className="text-center mt-10 text-[10px] text-slate-300 font-bold uppercase tracking-widest">vtech250 Software Solutions</p>
    </div>
  );
}

function MenuCard({ title, icon, color, onClick }) {
  return (
    <button onClick={onClick} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col items-center justify-center active:scale-95 transition-all hover:shadow-md">
      <div className={`p-4 rounded-2xl mb-3 ${color} shadow-inner`}>{icon}</div>
      <span className="text-blue-900 font-black text-[11px] uppercase tracking-wide">{title}</span>
    </button>
  );
}