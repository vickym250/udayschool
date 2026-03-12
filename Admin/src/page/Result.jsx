import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  collection, getDocs, query, where, serverTimestamp,
  doc, updateDoc, getDoc, runTransaction
} from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

/* ==========================================
   MAIN DASHBOARD PAGE
   ========================================== */
export default function FinalResultPage() {
  const navigate = useNavigate();
  
  const [session, setSession] = useState("2025-26");
  const availableSessions = ["2024-25", "2025-26", "2026-27", "2027-28"];
  const [dashboardSearch, setDashboardSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [allStudents, setAllStudents] = useState([]); 
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [name, setName] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [cls, setCls] = useState(""); 
  const [exam, setExam] = useState("Annual");
  const [rows, setRows] = useState([{ subject: "", total: "100", marks: "" }]);
  
  const [resultList, setResultList] = useState([]);
  const [filterClass, setFilterClass] = useState("");
  const [filterExam, setFilterExam] = useState("Annual");

  const [subjectMaster, setSubjectMaster] = useState({});
  const [classesList, setClassesList] = useState([]);
  const examTypes = ["Quarterly", "Half-Yearly", "Annual"];
  const [showDropdown, setShowDropdown] = useState(false);

  // Magic Features
  const [globalMax, setGlobalMax] = useState("100");
  const [magicMin, setMagicMin] = useState("50");
  const [magicMax, setMagicMax] = useState("90");

  // New States for Toppers
  const [schoolToppers, setSchoolToppers] = useState([]);
  const [classToppers, setClassToppers] = useState([]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const docSnap = await getDoc(doc(db, "school_config", "master_data"));
        if (docSnap.exists()) {
          const mapping = docSnap.data().mapping || {};
          setSubjectMaster(mapping);
          const sortedClasses = Object.keys(mapping).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
          setClassesList(sortedClasses);
          if (sortedClasses.length > 0) {
            setCls(sortedClasses[0]);
            setFilterClass(sortedClasses[0]);
          }
        }
      } catch (err) { console.error("Master data error:", err); }
    };
    fetchMasterData();
  }, []);

  const loadResults = async () => {
    const classToFetch = showForm ? cls : filterClass;
    const examToFetch = showForm ? exam : filterExam;
    if (!classToFetch) return;
    try {
      const q = query(
        collection(db, "examResults"), 
        where("className", "==", classToFetch), 
        where("exam", "==", examToFetch), 
        where("session", "==", session),
        where("delete_at", "==", null)
      );
      const snap = await getDocs(q);
      const results = snap.docs.map(d => {
          const data = d.data();
          const obt = data.rows?.reduce((s, r) => s + (Number(r.marks) || 0), 0);
          const total = data.rows?.reduce((s, r) => s + (Number(r.total) || 0), 0);
          const percentage = total > 0 ? ((obt / total) * 100).toFixed(1) : 0;
          return { id: d.id, percentage: Number(percentage), ...data };
      });
      setResultList(results);
      
      // Class Toppers Logic (Top 3)
      const sortedClass = [...results].sort((a, b) => b.percentage - a.percentage).slice(0, 3);
      setClassToppers(sortedClass);

      // School Toppers Logic (Pure session ke Top 3)
      const qAll = query(
        collection(db, "examResults"),
        where("session", "==", session),
        where("exam", "==", examToFetch),
        where("delete_at", "==", null)
      );
      const allSnap = await getDocs(qAll);
      const allRes = allSnap.docs.map(d => {
          const data = d.data();
          const obt = data.rows?.reduce((s, r) => s + (Number(r.marks) || 0), 0);
          const total = data.rows?.reduce((s, r) => s + (Number(r.total) || 0), 0);
          return { name: data.name, className: data.className, percentage: total > 0 ? Number(((obt / total) * 100).toFixed(1)) : 0 };
      }).sort((a, b) => b.percentage - a.percentage).slice(0, 3);
      setSchoolToppers(allRes);

    } catch (err) { console.error("Fetch Results Error:", err); }
  };

  useEffect(() => { if(!showForm) loadResults(); }, [filterClass, filterExam, session, showForm]);
  useEffect(() => { if(showForm) loadResults(); }, [exam, cls, session, showForm]);

  useEffect(() => {
    if (!cls) return;
    const fetchStudents = async () => {
      const q = query(collection(db, "students"), where("className", "==", cls), where("session", "==", session));
      const snap = await getDocs(q);
      setAllStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchStudents();
    if (!editingId && subjectMaster[cls]) {
      setRows(subjectMaster[cls].map(sub => ({ subject: sub, total: globalMax, marks: "" })));
    }
  }, [cls, subjectMaster, editingId, session]);

  const applyGlobalMax = (val) => {
    setGlobalMax(val);
    setRows(rows.map(r => ({ ...r, total: val })));
  };

  const magicFillMarks = () => {
    const min = parseInt(magicMin);
    const max = parseInt(magicMax);
    if (isNaN(min) || isNaN(max) || min > max) return toast.error("Check Min/Max Range!");
    setRows(rows.map(r => ({ ...r, marks: (Math.floor(Math.random() * (max - min + 1)) + min).toString() })));
    toast.success(`Magic Fill Applied!`);
  };

  const handleViewResult = (r) => {
    if (r.exam === "Annual") {
      navigate(`/marksheet/${r.studentId}/${r.session}`);
    } else {
      navigate(`/all-report/${r.studentId}/${r.session}`);
    }
  };

  const handlePrintAll = () => {
    const className = filterClass.replace(/\s+/g, '');
    if(filterExam === "Annual") {
        navigate(`/marksheet/${className}/${session}`);
    } else {
        navigate(`/all-report/${className}/${session}`);
    }
  };

  const handleRowChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const saveResult = async () => {
    if (!selectedStudentId) return toast.error("Student select karo!");
    const isAlreadyDone = resultList.some(res => String(res.studentId) === String(selectedStudentId) && res.exam === exam && res.session === session && !res.delete_at);
    if (!editingId && isAlreadyDone) return toast.error("Result already exists!");

    setLoading(true);
    try {
      const student = allStudents.find(s => s.id === selectedStudentId);
      const cleanRows = rows.filter(r => r.subject.trim() !== "").map(r => ({
        subject: r.subject.trim(),
        total: Number(r.total) || 0,
        marks: Number(r.marks) || 0
      }));

      await runTransaction(db, async (transaction) => {
        let finalSrNo;
        if (!editingId) {
          const qCount = query(
            collection(db, "examResults"),
            where("className", "==", cls),
            where("exam", "==", exam),
            where("session", "==", session),
            where("delete_at", "==", null)
          );
          const countSnap = await getDocs(qCount);
          finalSrNo = countSnap.size + 1;
        }

        const resultDocRef = editingId ? doc(db, "examResults", editingId) : doc(collection(db, "examResults"));
        
        const payload = {
          session, 
          studentId: selectedStudentId, 
          name: student?.name || name,
          className: cls, 
          examRollNo: student?.examRollNo || "",
          regNo: student?.regNo || "",
          fatherName: student?.fatherName || "", 
          motherName: student?.motherName || "",
          dob: student?.dob || "", 
          address: student?.address || "", 
          photoURL: student?.photoURL || "", 
          exam, 
          rows: cleanRows, 
          updatedAt: serverTimestamp(),
          delete_at: null 
        };

        if (editingId) transaction.update(resultDocRef, payload);
        else {
          payload.srNo = finalSrNo;
          payload.createdAt = serverTimestamp();
          transaction.set(resultDocRef, payload);
        }
      });

      toast.success("Result Saved!");
      setShowForm(false); setEditingId(null); loadResults();
    } catch (e) { 
      console.error(e);
      toast.error("Save failed."); 
    } finally { setLoading(false); }
  };

  const softDeleteResult = async (id) => {
    if(!window.confirm('Kyo bhai, sach me delete karna hai?')) return;
    try {
        const docRef = doc(db, "examResults", id);
        await updateDoc(docRef, {
            delete_at: serverTimestamp(),
            srNo: null 
        });
        toast.success("Result moved to trash (Soft Delete)");
        loadResults();
    } catch (err) {
        toast.error("Delete failed!");
    }
  }

  return (
    <div className="p-3 md:p-8 bg-slate-50 min-h-screen font-black italic text-slate-900 uppercase">
      <Toaster />
      
      <div className="max-w-7xl mx-auto">
        
        {/* NEW TOPPERS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* School Toppers */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-5 rounded-[24px] shadow-lg text-white">
                <h3 className="text-xs mb-3 flex items-center gap-2">🏆 SCHOOL TOPPERS (TOP 3)</h3>
                <div className="space-y-2">
                    {schoolToppers.length > 0 ? schoolToppers.map((t, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/10 p-2 rounded-xl border border-white/10">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">0{i+1}</span>
                                <div>
                                    <p className="text-xs leading-none">{t.name}</p>
                                    <p className="text-[9px] text-indigo-200 mt-1">{t.className}</p>
                                </div>
                            </div>
                            <span className="text-lg font-black">{t.percentage}%</span>
                        </div>
                    )) : <p className="text-[10px] opacity-50">No Data Available</p>}
                </div>
            </div>

            {/* Class Toppers */}
            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-5 rounded-[24px] shadow-lg text-white">
                <h3 className="text-xs mb-3 flex items-center gap-2">⭐ {filterClass} TOPPERS (TOP 3)</h3>
                <div className="space-y-2">
                    {classToppers.length > 0 ? classToppers.map((t, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/10 p-2 rounded-xl border border-white/10">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">0{i+1}</span>
                                <p className="text-xs leading-none">{t.name}</p>
                            </div>
                            <span className="text-lg font-black">{t.percentage}%</span>
                        </div>
                    )) : <p className="text-[10px] opacity-50">No Data Available in this Class</p>}
                </div>
            </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-6 rounded-[24px] md:rounded-[32px] border shadow-sm">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 italic leading-none">Result Dashboard</h1>
            <div className="flex items-center gap-2 mt-2">
               <span className="text-[9px] text-slate-400">SESSION:</span>
               <select value={session} onChange={(e) => setSession(e.target.value)} className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black outline-none border-none">
                  {availableSessions.map(s => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrintAll} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-black text-xs shadow-md">🖨️ Print All</button>
            <button onClick={() => { setEditingId(null); setSelectedStudentId(""); setStudentSearch(""); setShowForm(true); }} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-xs shadow-md">+ Add Result</button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-white p-4 rounded-2xl border shadow-sm">
            <span className="text-[9px] text-slate-400">CLASS</span>
            <select className="w-full bg-transparent font-black outline-none italic" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
              {classesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="bg-white p-4 rounded-2xl border shadow-sm">
            <span className="text-[9px] text-slate-400">EXAM</span>
            <select className="w-full bg-transparent font-black outline-none italic" value={filterExam} onChange={e => setFilterExam(e.target.value)}>
              {examTypes.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg text-white">
            <span className="text-[9px] text-indigo-200">SEARCH</span>
            <input type="text" placeholder="NAME / ROLL NO..." className="w-full bg-transparent text-white placeholder:text-indigo-300 font-black outline-none italic" value={dashboardSearch} onChange={(e) => setDashboardSearch(e.target.value)} />
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-[24px] border shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs italic">
            <thead className="bg-slate-50 border-b text-[9px] text-slate-400 uppercase">
              <tr>
                <th className="px-6 py-4">SR. NO</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4 text-center">Exam Roll</th>
                <th className="px-6 py-4 text-center">Exam</th>
                <th className="px-6 py-4 text-center">Percentage</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-black">
              {resultList
                .filter(r => r.name.toLowerCase().includes(dashboardSearch.toLowerCase()) || (r.examRollNo && r.examRollNo.toString().includes(dashboardSearch)))
                .sort((a, b) => (parseInt(a.examRollNo) || 0) - (parseInt(b.examRollNo) || 0))
                .map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-indigo-600">{r.srNo || '-'}</td>
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border">
                      {r.photoURL ? <img src={r.photoURL} className="w-full h-full object-cover" alt="S" /> : <div className="w-full h-full bg-slate-100" />}
                    </div>
                    <div>
                      <p className="text-slate-800 text-sm leading-none uppercase">{r.name}</p>
                      <p className="text-[9px] text-slate-400 italic mt-1 font-bold">Reg: {r.regNo || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">{r.examRollNo}</td>
                  <td className="px-6 py-4 text-center text-indigo-600">{r.exam}</td>
                  <td className="px-6 py-4 text-center font-black text-blue-600">{r.percentage}%</td>
                  <td className="px-6 py-4 text-right space-x-1">
                    <button onClick={() => { setEditingId(r.id); setSelectedStudentId(r.studentId); setStudentSearch(r.name); setCls(r.className); setExam(r.exam); setRows(r.rows); setShowForm(true); }} className="text-blue-600 border px-3 py-1 rounded-lg font-black text-[9px] hover:bg-blue-50">Edit</button>
                    <button onClick={() => handleViewResult(r)} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-black text-[9px] hover:bg-indigo-700">View</button>
                    <button onClick={() => softDeleteResult(r.id)} className="text-red-300 ml-1 hover:text-red-600">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result Entry Form */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-2">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-[30px] shadow-2xl overflow-y-auto p-5 md:p-10 italic">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-lg font-black text-indigo-600 italic">Result Entry Form</h2>
              <button onClick={() => setShowForm(false)} className="bg-slate-100 p-2 px-4 rounded-full font-black">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block text-[9px]">CLASS</label>
                      <select className="w-full bg-slate-50 p-3 rounded-2xl font-black outline-none" value={cls} onChange={e => setCls(e.target.value)} disabled={editingId}>
                        {classesList.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[9px]">EXAM</label>
                      <select className="w-full bg-slate-50 p-3 rounded-2xl font-black outline-none" value={exam} onChange={e => setExam(e.target.value)}>
                        {examTypes.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  </div>
              </div>

              <div className="relative">
                <label className="text-slate-400 block text-[9px]">STUDENT SEARCH ({cls})</label>
                <input type="text" className="w-full bg-indigo-50/50 p-3 font-black border-2 border-indigo-100 rounded-2xl outline-none" value={studentSearch} onClick={() => setShowDropdown(true)} onChange={e => {setStudentSearch(e.target.value); setShowDropdown(true);}} disabled={editingId} />
                {showDropdown && !editingId && (
                  <div className="absolute left-0 w-full bg-white border-2 border-indigo-100 rounded-2xl z-20 max-h-56 overflow-y-auto shadow-xl mt-1">
                    {allStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || (s.examRollNo && s.examRollNo.toString().includes(studentSearch))).map(s => {
                       const isDone = resultList.some(res => String(res.studentId) === String(s.id) && res.exam === exam && res.session === session && !res.delete_at);
                       return (
                         <div key={s.id} onClick={() => { if(isDone) return toast.error("Already Done!"); setSelectedStudentId(s.id); setName(s.name); setStudentSearch(s.name); setShowDropdown(false); }} className={`p-3 cursor-pointer flex justify-between items-center hover:bg-indigo-600 hover:text-white ${isDone ? 'opacity-40 pointer-events-none bg-red-50' : ''}`}>
                           <div className="flex flex-col">
                             <span className="text-xs uppercase">{s.name}</span>
                             <span className="text-[8px] font-bold">EXAM ROLL: {s.examRollNo}</span>
                           </div>
                           {isDone && <span className="text-[7px] font-black">✓ DONE</span>}
                         </div>
                       );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Magic Fill Settings */}
            <div className="flex flex-wrap items-end gap-3 mb-4 bg-slate-50 p-4 rounded-3xl border border-dashed border-slate-200">
               <div className="w-24">
                  <label className="text-slate-400 block text-[7px] mb-1">ALL MAX</label>
                  <input type="number" className="w-full p-2 bg-white rounded-xl font-black outline-none border text-center text-xs" value={globalMax} onChange={(e) => applyGlobalMax(e.target.value)} />
               </div>
               <div className="w-20">
                  <label className="text-slate-400 block text-[7px] mb-1">MIN RANGE</label>
                  <input type="number" className="w-full p-2 bg-white rounded-xl font-black outline-none border text-center text-xs text-red-500" value={magicMin} onChange={(e) => setMagicMin(e.target.value)} />
               </div>
               <div className="w-20">
                  <label className="text-slate-400 block text-[7px] mb-1">MAX RANGE</label>
                  <input type="number" className="w-full p-2 bg-white rounded-xl font-black outline-none border text-center text-xs text-green-600" value={magicMax} onChange={(e) => setMagicMax(e.target.value)} />
               </div>
               <button onClick={magicFillMarks} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2 rounded-xl font-black text-[9px] shadow-lg hover:scale-105 transition-transform">✨ APPLY MAGIC FILL</button>
            </div>

            {/* Marks Table Entry */}
            <div className="rounded-[20px] border-2 border-slate-50 overflow-hidden bg-slate-50/20 mb-8">
              <table className="w-full text-xs font-black uppercase italic">
                <thead className="bg-slate-100 text-slate-400">
                  <tr><th className="p-3 text-left">Subject</th><th className="p-3 text-center w-20">Total</th><th className="p-3 text-center w-24 text-indigo-600">Obt.</th><th className="p-3 w-8"></th></tr>
                </thead>
                <tbody className="divide-y divide-white">
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className="p-1"><input className="w-full p-2 bg-transparent outline-none font-black" value={r.subject} onChange={e => handleRowChange(i, 'subject', e.target.value)} /></td>
                      <td className="p-1"><input type="number" className="w-full p-2 bg-transparent outline-none text-center" value={r.total} onChange={e => handleRowChange(i, 'total', e.target.value)} /></td>
                      <td className="p-1"><input type="number" className="w-full p-2 bg-transparent outline-none text-center text-indigo-600 text-lg font-black" value={r.marks} onChange={e => handleRowChange(i, 'marks', e.target.value)} /></td>
                      <td className="p-1 text-center"><button onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="text-red-200 hover:text-red-600">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex gap-2">
              <button className="flex-1 bg-slate-100 py-4 rounded-2xl font-black shadow-sm" onClick={() => setShowForm(false)}>Close</button>
              <button disabled={loading} className="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white font-black shadow-xl hover:bg-indigo-700" onClick={saveResult}>{loading ? 'WAIT...' : 'SAVE RESULT'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}