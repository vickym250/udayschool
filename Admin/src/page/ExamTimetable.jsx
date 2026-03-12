import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { 
  doc, setDoc, getDoc, onSnapshot, collection, 
  query, where, getDocs, writeBatch 
} from "firebase/firestore"; 

const ExamTimetable = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [selectedClass, setSelectedClass] = useState("Class 1"); 
  const [selectedExam, setSelectedExam] = useState("Half-Yearly"); 
  const [selectedSession, setSelectedSession] = useState("2025-26");
  
  const [masterMapping, setMasterMapping] = useState({}); 
  const [dynamicSubjects, setDynamicSubjects] = useState([]); 
  const [availableClasses, setAvailableClasses] = useState([]); 

  const [startClass, setStartClass] = useState("");
  const [endClass, setEndClass] = useState("");

  // --- Global Timing States ---
  const [timings, setTimings] = useState({
    firstMtg: "09:00 AM - 12:00 PM",
    secondMtg: "01:00 PM - 04:00 PM"
  });

  const classOrder = [
    "Nursery", "LKG", "UKG", 
    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", 
    "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"
  ];

  const examTypes = ["Quarterly", "Half-Yearly", "Annual", "Pre-Board"];

  const [formData, setFormData] = useState({ 
    date: '', 
    day: '', 
    subject: '', // 1st Meeting
    subject2: '', // 2nd Meeting
    isHoliday: false 
  });

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  // 1. Fetch Classes and Master Mapping
  useEffect(() => {
    const unsubClasses = onSnapshot(collection(db, "classes"), (snapshot) => {
      const classData = snapshot.docs.map(d => (d.data().name || d.data().className || "").trim());
      const sortedClasses = classData.sort((a, b) => {
        const indexA = classOrder.indexOf(a);
        const indexB = classOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
      setAvailableClasses(sortedClasses);
      if(sortedClasses.length > 0) {
        setStartClass(sortedClasses[0]);
        setEndClass(sortedClasses[sortedClasses.length - 1]);
      }
    });

    const unsubMapping = onSnapshot(doc(db, "school_config", "master_data"), (docSnap) => {
      if (docSnap.exists()) setMasterMapping(docSnap.data().mapping || {});
    });

    return () => { unsubClasses(); unsubMapping(); };
  }, []);

  // 2. Fetch Timetable & Timings for Selected Class
  useEffect(() => {
    const fetchClassExams = async () => {
      setFetching(true);
      try {
        const docRef = doc(db, "Timetables", selectedClass);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data[selectedExam]) {
            setExams(data[selectedExam].sort((a, b) => new Date(a.date) - new Date(b.date)));
          } else {
            setExams([]);
          }
          if (data.timings) setTimings(data.timings); // Load saved timings
        } else {
          setExams([]);
        }
      } catch (err) { console.error(err); }
      setFetching(false);
    };

    fetchClassExams();
    const subjectsForThisClass = masterMapping[selectedClass] || [];
    setDynamicSubjects(subjectsForThisClass);
    setFormData(prev => ({ 
        ...prev, 
        subject: subjectsForThisClass[0] || '', 
        subject2: '', 
        isHoliday: false 
    }));
  }, [selectedClass, selectedExam, masterMapping]);

  // 3. Auto Day Detection
  useEffect(() => {
    if (formData.date) {
      const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(formData.date));
      setFormData(prev => ({ ...prev, day: dayName }));
    }
  }, [formData.date]);

  const addToList = (e) => {
    e.preventDefault();
    if(!formData.date) return alert("Bhai, Date select karo!");

    const newEntry = { 
        ...formData, 
        subject: formData.isHoliday ? "OFF / GAP" : (formData.subject || "---"), 
        subject2: formData.isHoliday ? "OFF / GAP" : (formData.subject2 || "---"),
        id: Date.now() 
    };
    
    const updatedExams = [...exams, newEntry].sort((a, b) => new Date(a.date) - new Date(b.date));
    setExams(updatedExams);
    
    // Auto increment date for next subject
    const currentDate = new Date(formData.date);
    currentDate.setDate(currentDate.getDate() + 1);
    setFormData({ 
        ...formData, 
        date: currentDate.toISOString().split('T')[0], 
        isHoliday: false, 
        subject: dynamicSubjects[0] || '',
        subject2: ''
    });
  };

  const saveToDatabase = async () => {
    if (exams.length === 0) return alert("List khali hai!");
    setLoading(true);
    try {
      const docRef = doc(db, "Timetables", selectedClass);
      await setDoc(docRef, { 
        [selectedExam]: exams,
        timings: timings 
      }, { merge: true });
      alert(`✅ Saved for ${selectedClass}!`);
    } catch (e) { alert("Error saving!"); }
    setLoading(false);
  };

  const bulkSaveToRange = async () => {
    if (exams.length === 0) return alert("Pehle entries add karein!");
    const startIndex = availableClasses.indexOf(startClass);
    const endIndex = availableClasses.indexOf(endClass);
    if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) return alert("Range galat hai!");

    const selectedRange = availableClasses.slice(startIndex, endIndex + 1);
    const confirm = window.confirm(`Bhai, ye schedule ${selectedRange.length} classes mein save hoga. Pakka?`);
    if (!confirm) return;

    setLoading(true);
    try {
      const batch = writeBatch(db);
      selectedRange.forEach((clsName) => {
        const docRef = doc(db, "Timetables", clsName);
        batch.set(docRef, { [selectedExam]: exams, timings: timings }, { merge: true });
      });
      await batch.commit();
      alert(`✅ Bulk Save Success!`);
    } catch (e) { alert("Bulk save fail!"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10 text-slate-800 uppercase italic">
      {fetching && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-md font-black text-indigo-600 animate-pulse tracking-widest text-xl">LOADING DATA...</div>}

      <div className="max-w-7xl mx-auto">
        
        {/* --- Header & Timing Setup --- */}
        <div className="bg-white p-6 rounded-3xl shadow-sm mb-8 no-print border border-slate-100">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-2xl font-black text-indigo-900 leading-tight">Exam Planner</h1>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest">Dual Meeting & Timing Control</p>
            </div>

            {/* Timing Inputs */}
            <div className="flex flex-wrap gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-indigo-500">1st Mtg:</span>
                <input type="text" className="p-2 rounded-lg border text-[11px] font-bold outline-none w-44 bg-white" value={timings.firstMtg} onChange={(e) => setTimings({...timings, firstMtg: e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-violet-500">2nd Mtg:</span>
                <input type="text" className="p-2 rounded-lg border text-[11px] font-bold outline-none w-44 bg-white" value={timings.secondMtg} onChange={(e) => setTimings({...timings, secondMtg: e.target.value})} />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="p-2 rounded-xl font-bold bg-white text-indigo-600 outline-none text-xs border">
                {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
              <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} className="p-2 rounded-xl font-bold bg-white text-violet-600 outline-none text-xs border">
                {examTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* --- Left Column: Entry Form --- */}
          <div className="no-print lg:col-span-4 bg-white p-6 rounded-[2rem] shadow-xl border border-indigo-50 h-fit">
            <h3 className="text-xs font-black mb-6 text-indigo-900 tracking-widest underline decoration-2 underline-offset-4">Add Schedule</h3>
            <form onSubmit={addToList} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400">Select Date</label>
                <input type="date" className="w-full p-4 rounded-2xl bg-slate-50 font-bold border-none outline-none focus:ring-2 ring-indigo-500/20" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>

              <div className="flex items-center gap-3 bg-red-50 p-4 rounded-2xl border border-red-100 cursor-pointer">
                <input type="checkbox" id="isHoliday" className="w-4 h-4 accent-red-600" checked={formData.isHoliday} onChange={(e) => setFormData({...formData, isHoliday: e.target.checked})} />
                <label htmlFor="isHoliday" className="text-xs font-bold text-red-700 cursor-pointer">Holiday / Gap Day</label>
              </div>

              {!formData.isHoliday && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-indigo-400 block mb-1">Morning Session (1st)</label>
                      <select className="w-full p-4 rounded-2xl bg-slate-50 font-bold outline-none border border-indigo-50" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}>
                          <option value="">-- No Exam --</option>
                          {dynamicSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-violet-400 block mb-1">Afternoon Session (2nd)</label>
                      <select className="w-full p-4 rounded-2xl bg-slate-50 font-bold outline-none border border-violet-50" value={formData.subject2} onChange={e => setFormData({...formData, subject2: e.target.value})}>
                          <option value="">-- No Exam --</option>
                          {dynamicSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
              <button type="submit" className="w-full p-5 bg-indigo-600 text-white rounded-2xl font-black tracking-widest shadow-lg hover:shadow-indigo-200 active:scale-95 transition-all">ADD TO LIST</button>
            </form>
          </div>

          {/* --- Right Column: Table View --- */}
          <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
             <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-slate-900 underline decoration-indigo-500 decoration-4 underline-offset-8 uppercase">{selectedExam}</h2>
                <div className="flex justify-center gap-4 mt-4 font-bold text-[10px] text-slate-500 tracking-tighter">
                  <span className="bg-indigo-50 px-3 py-1 rounded-full text-indigo-600">1st: {timings.firstMtg}</span>
                  <span className="bg-violet-50 px-3 py-1 rounded-full text-violet-600">2nd: {timings.secondMtg}</span>
                </div>
             </div>
             
             {exams.length > 0 ? (
               <div className="overflow-hidden rounded-3xl border border-slate-100">
                 <table className="w-full text-left">
                   <thead className="bg-slate-900 text-[10px] text-white tracking-widest">
                     <tr>
                       <th className="p-5 font-bold">DATE & DAY</th>
                       <th className="p-5 font-bold">1st MEETING</th>
                       <th className="p-5 font-bold">2nd MEETING</th>
                       <th className="no-print p-5 font-bold text-right">DEL</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50 italic">
                     {exams.map((item) => (
                       <tr key={item.id} className={item.isHoliday ? 'bg-red-50/50' : 'hover:bg-slate-50 transition-colors'}>
                         <td className="p-5 border-r border-slate-100">
                            <div className="font-black text-indigo-600">{formatDateDisplay(item.date)}</div>
                            <div className="text-[9px] font-bold text-slate-400">{item.day}</div>
                         </td>
                         <td className="p-5 font-black text-slate-700 border-r border-slate-100">{item.subject}</td>
                         <td className="p-5 font-black text-violet-700">{item.subject2}</td>
                         <td className="no-print p-5 text-right">
                            <button onClick={() => setExams(exams.filter(x => x.id !== item.id))} className="text-red-400 hover:text-red-600 font-black text-[10px] underline">DEL</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             ) : (
               <div className="text-center py-20 text-slate-300 font-bold text-xs tracking-widest italic border-2 border-dashed rounded-3xl">TIMETABLE LIST KHIALI HAI...</div>
             )}

             {/* --- Action Controls --- */}
             <div className="no-print mt-8 pt-8 border-t border-slate-100">
                <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                   <div className="flex-1 w-full bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
                      <span className="text-[9px] font-black text-slate-400">APPLY RANGE:</span>
                      <select value={startClass} onChange={(e) => setStartClass(e.target.value)} className="bg-transparent font-bold text-indigo-600 outline-none text-xs flex-1">
                        {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                      </select>
                      <span className="text-slate-300 font-black">→</span>
                      <select value={endClass} onChange={(e) => setEndClass(e.target.value)} className="bg-transparent font-bold text-indigo-600 outline-none text-xs flex-1">
                        {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                      </select>
                   </div>
                   <button onClick={bulkSaveToRange} disabled={loading} className="w-full md:w-auto bg-indigo-900 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-xl hover:bg-black transition-all">
                      🚀 BULK SAVE
                   </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={saveToDatabase} disabled={loading} className="flex-1 bg-emerald-500 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-emerald-600 transition-all active:scale-95">
                    {loading ? "SAVING..." : `💾 SAVE SPECIFIC FOR ${selectedClass}`}
                  </button>
                  <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-5 rounded-2xl font-black shadow-lg hover:bg-black transition-all active:scale-95">🖨️ PRINT SHEET</button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamTimetable;