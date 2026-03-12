import React, { useState, useEffect } from "react";
import { db } from "../firebase"; 
import { 
  collection, getDocs, query, where, serverTimestamp,
  doc, updateDoc, onSnapshot, getDoc, runTransaction 
} from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import { Trophy, Search, Plus, X, Edit3, Save, ArrowLeft, Zap, Calendar, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";

const examTypes = ["Quarterly", "Half-Yearly", "Annual"];
const sessionsList = ["2024-25", "2025-26", "2026-27"];

const sortClasses = (classes) => {
  const order = ["LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
  return classes.sort((a, b) => order.indexOf(a) - order.indexOf(b));
};

export default function MobileFinalResult() {
  const navigate = useNavigate();
  const [session, setSession] = useState("2025-26"); 
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [classesList, setClassesList] = useState([]);
  const [dynamicSubjectMaster, setDynamicSubjectMaster] = useState({});
  const [allStudents, setAllStudents] = useState([]); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [cls, setCls] = useState(""); 
  const [exam, setExam] = useState("Annual");
  const [rows, setRows] = useState([]);
  const [resultList, setResultList] = useState([]);
  const [masterMax, setMasterMax] = useState("100");
  const [minRand, setMinRand] = useState(33);
  const [maxRand, setMaxRand] = useState(90);

  // 1. Fetch Dynamic Config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, "school_config", "master_data");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const mapping = docSnap.data().mapping;
          const sortedCls = sortClasses(Object.keys(mapping));
          setDynamicSubjectMaster(mapping);
          setClassesList(sortedCls);
          if (!cls) setCls(sortedCls[0]); 
        }
      } catch (err) { toast.error("Config fail!"); }
    };
    fetchConfig();
  }, []);

  // 2. Real-time Results Listener (Using your session logic)
  useEffect(() => {
    if (!cls) return;
    const q = query(
      collection(db, "examResults"), 
      where("className", "==", cls), 
      where("exam", "==", exam),
      where("session", "==", session)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setResultList(list.sort((a, b) => parseInt(a.roll) - parseInt(b.roll)));
    });
    return () => unsub();
  }, [cls, exam, session]);

  // 3. Fetch Students Logic
  useEffect(() => {
    if (!cls) return;
    const fetchStudents = async () => {
      const q = query(collection(db, "students"), where("className", "==", cls), where("session", "==", session));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => !s.deletedAt); 
      setAllStudents(list.sort((a, b) => parseInt(a.examRollNo) - parseInt(b.examRollNo)));
    };
    fetchStudents();
    if (!editingId && dynamicSubjectMaster[cls]) {
      setRows(dynamicSubjectMaster[cls].map(sub => ({ subject: sub, total: masterMax, marks: "" })));
    }
  }, [cls, editingId, masterMax, session, dynamicSubjectMaster]);

  // MAGIC FILLER (Unchanged)
  const autoFillRandomMarks = () => {
    if (!selectedStudent) return toast.error("Student select karein!");
    setRows(rows.map(r => ({
      ...r,
      marks: Math.floor(Math.random() * (parseInt(maxRand) - parseInt(minRand) + 1)) + parseInt(minRand)
    })));
  };

  const handleMasterMaxChange = (val) => {
    setMasterMax(val);
    setRows(rows.map(r => ({ ...r, total: val })));
  };

  // SAVE RESULT (Using your Atomic Sr.No Transaction Logic)
  const saveResult = async () => {
    if (!selectedStudent) return toast.error("Student select karein!");
    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        let finalSrNo = editingId ? (resultList.find(r => r.id === editingId)?.srNo) : null;

        // Generating sequential SR. NO only for NEW records
        if (!editingId) {
          const counterId = `counter_${cls}_${exam}_${session}`.replace(/\s+/g, "");
          const counterRef = doc(db, "counters", counterId);
          const counterSnap = await transaction.get(counterRef);

          if (!counterSnap.exists()) {
            finalSrNo = 1;
            transaction.set(counterRef, { current: 1 });
          } else {
            finalSrNo = counterSnap.data().current + 1;
            transaction.update(counterRef, { current: finalSrNo });
          }
        }

        const resDocRef = editingId ? doc(db, "examResults", editingId) : doc(collection(db, "examResults"));
        const payload = {
          className: cls, exam, session,
          fatherName: selectedStudent.fatherName || "",
          name: selectedStudent.name || "",
          photoURL: selectedStudent.photoURL || "",
          roll: selectedStudent.examRollNo || "",
          rows: rows.filter(r => r.subject && r.marks !== ""),
          studentId: selectedStudent.id,
          updatedAt: serverTimestamp(),
          srNo: finalSrNo // Saving the atomic serial number
        };

        if (editingId) transaction.update(resDocRef, payload);
        else {
          payload.createdAt = serverTimestamp();
          transaction.set(resDocRef, payload);
        }
      });

      setShowForm(false);
      toast.success("Result Published Successfully! 🎉");
    } catch (error) { toast.error("Save failed!"); console.error(error); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans">
      <Toaster position="top-center" />
      
      {/* MOBILE HEADER */}
      <div className="sticky top-0 z-40 bg-white px-4 py-4 flex items-center justify-between border-b border-slate-100 shadow-sm">
        <button onClick={() => navigate("/")} className="p-2 bg-slate-50 rounded-full text-slate-600 active:scale-90 transition-transform"><ArrowLeft size={20}/></button>
        <div className="text-center">
            <h1 className="text-xs font-black uppercase tracking-widest text-slate-800 leading-none">Result Manager</h1>
            <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase italic">{session} • {cls}</p>
        </div>
        <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100 shadow-inner"><Trophy size={18} className="text-amber-500"/></div>
      </div>

      <div className="p-4 space-y-4">
        {/* SESSION PICKER */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600"><Calendar size={18}/></div>
                <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Session</p>
                    <p className="text-sm font-black text-slate-700">{session}</p>
                </div>
            </div>
            <select value={session} onChange={(e) => setSession(e.target.value)} className="bg-slate-100 border-none rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none">
                {sessionsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        </div>

        {/* CLASS SELECTOR */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {classesList.map(c => (
            <button key={c} onClick={() => setCls(c)} className={`px-5 py-2 rounded-2xl text-xs font-black transition-all whitespace-nowrap border ${cls === c ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>{c}</button>
          ))}
        </div>

        {/* EXAM TABS */}
        <div className="flex gap-1 bg-slate-200/50 p-1 rounded-2xl shadow-inner">
          {examTypes.map(e => (
            <button key={e} onClick={() => setExam(e)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${exam === e ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{e}</button>
          ))}
        </div>

        {/* DATA LIST (WITH SERIAL NUMBER) */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center px-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Records Found</p>
             <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">{resultList.length}</span>
          </div>
          {resultList.map((item, index) => (
            <div key={item.id} className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                {/* LIST SERIAL NUMBER */}
                <div className="h-10 w-10 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-300 text-xs">
                    {index + 1}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm uppercase leading-tight">{item.name}</h3>
                  <p className="text-[9px] text-slate-400 font-black uppercase italic tracking-wider">Roll: {item.roll} • {item.exam}</p>
                </div>
              </div>
              <button onClick={() => { setEditingId(item.id); setSelectedStudent(item); setRows(item.rows); setShowForm(true); }} className="p-3 bg-slate-50 text-indigo-400 rounded-2xl active:scale-90 transition-transform"><Edit3 size={18}/></button>
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => { setEditingId(null); setSelectedStudent(null); setStudentSearch(""); setShowForm(true); }} className="fixed bottom-6 right-6 bg-indigo-600 text-white w-16 h-16 rounded-[2.2rem] shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-all border-4 border-white"><Plus size={30} /></button>

      {/* ENTRY FORM */}
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end">
          <div className="bg-[#F8FAFC] w-full h-[94vh] rounded-t-[3.5rem] flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-hidden">
            <div className="px-8 pt-4 pb-6 bg-white border-b border-slate-50">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">Result Entry</h2>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{cls} • {session}</p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-3 bg-slate-100 text-slate-400 rounded-full active:scale-90"><X size={20}/></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
              {/* MAGIC FILLER */}
              <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl flex items-center justify-between relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-[9px] font-black opacity-50 uppercase mb-2 flex items-center gap-1"><Zap size={10} fill="currentColor"/> Magic Fill</p>
                  <div className="flex items-center gap-2">
                    <input type="number" value={minRand} onChange={(e)=>setMinRand(e.target.value)} className="w-12 bg-white/10 rounded-lg text-center font-bold text-xs py-1 outline-none border border-white/5" />
                    <span className="opacity-30 text-[10px]">to</span>
                    <input type="number" value={maxRand} onChange={(e)=>setMaxRand(e.target.value)} className="w-12 bg-white/10 rounded-lg text-center font-bold text-xs py-1 outline-none border border-white/5" />
                  </div>
                </div>
                <button onClick={autoFillRandomMarks} className="bg-indigo-600 p-4 rounded-2xl active:scale-90 shadow-lg relative z-10 hover:bg-indigo-500 transition-colors"><Zap size={20} fill="currentColor"/></button>
              </div>

              {/* SEARCH STUDENT */}
              <div className="relative">
                <div className="flex items-center bg-white border border-slate-100 rounded-3xl px-5 py-4 shadow-sm focus-within:ring-2 ring-indigo-500/20 transition-all">
                  <Search size={18} className="text-slate-400" />
                  <input type="text" placeholder="Select Candidate..." className="bg-transparent flex-1 ml-3 font-bold text-sm outline-none" value={studentSearch} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} onChange={(e) => {setStudentSearch(e.target.value); setSelectedStudent(null);}} />
                </div>
                {isSearchFocused && !selectedStudent && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-100 rounded-3xl mt-2 shadow-2xl z-50 max-h-52 overflow-y-auto no-scrollbar p-2">
                    {allStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).map(s => (
                      <button key={s.id} onClick={() => { setSelectedStudent(s); setStudentSearch(s.name); }} className="w-full p-4 text-left rounded-2xl border-b border-slate-50 last:border-0 active:bg-indigo-50 flex justify-between items-center">
                        <span className="font-bold text-xs uppercase text-slate-700">{s.name}</span>
                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-lg italic border border-indigo-100">#{s.examRollNo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* SELECTED STUDENT INFO */}
              {selectedStudent && (
                <div className="bg-white border border-indigo-100 p-5 rounded-3xl flex justify-between items-center shadow-sm animate-in zoom-in duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-md">S</div>
                    <div>
                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none">Verified Candidate</p>
                        <h3 className="font-black text-sm uppercase text-slate-800 leading-none mt-1">{selectedStudent.name}</h3>
                    </div>
                  </div>
                  <div className="text-right font-black italic text-indigo-600">#{selectedStudent.examRollNo}</div>
                </div>
              )}

              {/* MARKS ENTRY (With S.No for each Subject Row) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Hash size={12}/> Subject Scores</p>
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-100">
                    <span className="text-[8px] font-black text-slate-300 uppercase leading-none">Base Max:</span>
                    <input type="number" value={masterMax} onChange={(e) => handleMasterMaxChange(e.target.value)} className="w-8 text-[10px] font-black text-indigo-600 outline-none bg-transparent" />
                  </div>
                </div>
                <div className="space-y-3">
                  {rows.map((r, i) => (
                    <div key={i} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-indigo-200 transition-colors group">
                      <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-300 text-[10px] border border-slate-100">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <span className="font-black text-slate-700 uppercase text-[11px] block truncate italic leading-tight">{r.subject}</span>
                        <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter italic">Out of {r.total}</span>
                      </div>
                      <div className="bg-slate-50 px-4 py-2 rounded-2xl flex items-center gap-2 border border-slate-100 focus-within:border-indigo-400 focus-within:bg-white transition-all shadow-inner">
                         <input 
                            type="number" 
                            value={r.marks} 
                            onChange={(e) => {
                              const newRows = [...rows];
                              newRows[i].marks = e.target.value;
                              setRows(newRows);
                            }}
                            className="w-10 text-center font-black text-indigo-600 bg-transparent outline-none text-lg" 
                            placeholder="--"
                          />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FIXED BOTTOM SAVE */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
              <button 
                onClick={saveResult}
                disabled={loading || !selectedStudent}
                className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase text-sm shadow-xl active:scale-95 disabled:bg-slate-200 flex items-center justify-center gap-3 transition-all tracking-[0.1em]"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Save size={20}/> Publish Result</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}