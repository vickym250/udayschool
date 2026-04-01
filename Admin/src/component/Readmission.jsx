import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateTotalStudents } from "./updateTotalStudents";
import AdmissionDetails from "./AdmisionForm";
import toast from "react-hot-toast";

export default function Readmission({ close, studentData }) {
  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [savedStudentId, setSavedStudentId] = useState(null);

  const [subjectMapping, setSubjectMapping] = useState({});
  const [allMasterSubjects, setAllMasterSubjects] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const translations = {
    en: { title: "Re-Admission / Promotion", studentInfo: "Session Details", parentInfo: "Parent Info", name: "Full Name", saveBtn: "CONFIRM PROMOTION", admDate: "Promotion Date" },
    hi: { title: "पुनः प्रवेश / पदोन्नति", studentInfo: "सत्र का विवरण", parentInfo: "अभिभावक की जानकारी", name: "पूरा नाम", saveBtn: "प्रमोशन सुरक्षित करें", admDate: "पदोन्नति तिथि" }
  };

  const t = translations[lang];
  const months = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];

  const [form, setForm] = useState({
    name: "", className: "", rollNumber: "...", regNo: "", phone: "", address: "",
    fatherName: "", motherName: "", aadhaar: "", gender: "", category: "", dob: "", session: "", photoURL: "",
    parentId: "", admissionDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const fetchMasterAndStudent = async () => {
      try {
        const configSnap = await getDoc(doc(db, "school_config", "master_data"));
        if (configSnap.exists()) {
          const data = configSnap.data();
          setSubjectMapping(data.mapping || {});
          setAllMasterSubjects(data.allSubjects || []);
          setAvailableClasses(Object.keys(data.mapping || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
        }

        if (studentData) {
          const now = new Date();
          // April loop for session change
          const session = now.getMonth() + 1 >= 4 
            ? `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(-2)}` 
            : `${now.getFullYear() - 1}-${now.getFullYear().toString().slice(-2)}`;
          
          setForm({
            ...studentData,
            session,
            rollNumber: "...",
            admissionDate: new Date().toISOString().split("T")[0],
          });
          setSubjects(studentData.subjects || []);
        }
      } catch (err) { console.error("Error:", err); }
    };
    fetchMasterAndStudent();
  }, [studentData]);

  // Auto Roll Logic
  useEffect(() => {
    if (!form.className || !form.session) return;
    const fetchRoll = async () => {
      const q = query(collection(db, "students"), where("className", "==", form.className), where("session", "==", form.session));
      const snap = await getDocs(q);
      let max = 0;
      snap.forEach(d => {
        const r = parseInt(d.data().rollNumber);
        if (!isNaN(r) && r > max) max = r;
      });
      setForm(prev => ({ ...prev, rollNumber: (max + 1).toString() }));
    };
    fetchRoll();
  }, [form.className, form.session]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "className") {
      setForm(prev => ({ ...prev, className: value, rollNumber: "Wait..." }));
      setSubjects(subjectMapping[value] || []);
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.rollNumber === "Wait...") return toast.error("Please wait for Roll Number");
    
    setLoading(true);
    try {
      const { id, createdAt, photo, ...cleanForm } = form;

      // 1. Create New Student Doc for New Session
      const sDoc = await addDoc(collection(db, "students"), {
        ...cleanForm,
        subjects,
        isReadmission: true, 
        status: "active",
        attendance: months.reduce((acc, m) => ({ ...acc, [m]: { present: 0, absent: 0 } }), {}),
        createdAt: serverTimestamp(),
        deletedAt: null
      });

      // 2. Mark Old Doc as Promoted
      if (studentData?.id) {
        await updateDoc(doc(db, "students", studentData.id), {
          status: "promoted",
          isPromoted: true,
          nextSessionDocId: sDoc.id
        });
      }

      // Update Parent collection to include new student ID
      if (form.parentId) {
        await updateDoc(doc(db, "parents", form.parentId), { students: arrayUnion(sDoc.id) });
      }
      
      await updateTotalStudents();
      setSavedStudentId(sDoc.id);
      toast.success("Student Promoted Successfully!");
      setShowPrint(true);
    } catch (err) { 
      console.error(err);
      toast.error("Promotion failed!");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black/70 z-[100] p-4 backdrop-blur-sm overflow-y-auto">
      {!showPrint ? (
        <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl flex flex-col my-auto animate-in zoom-in duration-300 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b flex justify-between items-center bg-emerald-700 text-white">
            <div>
               <h2 className="text-xl font-black uppercase tracking-tight">{t.title}</h2>
               <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">Promotion to {form.session}</p>
            </div>
            <button type="button" onClick={close} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-2xl font-light">&times;</button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
            
            {/* ID Bar */}
            <div className="flex gap-4">
              <div className="flex-1 bg-emerald-50 p-4 rounded-3xl border-2 border-emerald-100 text-center">
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Registration No</p>
                <p className="text-xl font-black text-emerald-800">{form.regNo}</p>
              </div>
              <div className="flex-1 bg-blue-50 p-4 rounded-3xl border-2 border-blue-100 text-center">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Next Roll No</p>
                <p className="text-xl font-black text-blue-800">{form.rollNumber}</p>
              </div>
            </div>

            {/* Language Toggle */}
            <div className="flex justify-end">
                <button type="button" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider text-slate-500">
                    {lang === 'en' ? 'हिन्दी में बदलें' : 'Switch to English'}
                </button>
            </div>

            <section className="space-y-5">
              <div className="font-black text-emerald-700 border-l-4 border-emerald-700 pl-3 uppercase text-[11px] tracking-widest">{t.studentInfo}</div>
              
              <div className="grid md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">{t.admDate}</label>
                  <input type="date" name="admissionDate" value={form.admissionDate} onChange={handleChange} className="border-2 p-3.5 rounded-2xl focus:border-emerald-500 focus:ring-4 ring-emerald-50 outline-none transition-all font-bold" required />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Promote to Class</label>
                  <select name="className" value={form.className} onChange={handleChange} className="border-2 p-3.5 rounded-2xl focus:border-emerald-500 outline-none font-black text-emerald-800 appearance-none bg-white" required>
                    <option value="">-- Choose Class --</option>
                    {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Student Name</label>
                  <input value={form.name} readOnly className="border-2 p-3.5 rounded-2xl bg-slate-50 font-bold text-slate-500 cursor-not-allowed" />
                </div>
              </div>
            </section>

            {/* Subjects */}
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-4 text-center tracking-widest italic">New Subjects for {form.className || '...'}</p>
                <div className="flex flex-wrap gap-2 mb-5 justify-center">
                  {subjects.map((sub, i) => (
                    <span key={i} className="bg-white border shadow-sm text-slate-700 px-4 py-2 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1">
                      {sub} 
                      <button type="button" onClick={() => setSubjects(s => s.filter((_, idx) => idx !== i))} className="w-4 h-4 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors">&times;</button>
                    </span>
                  ))}
                </div>
                <select 
                  value="" 
                  onChange={(e) => { if(e.target.value && !subjects.includes(e.target.value)) setSubjects([...subjects, e.target.value]) }}
                  className="w-full text-xs p-4 rounded-2xl border-none ring-2 ring-emerald-100 outline-none bg-white font-bold text-emerald-800 shadow-inner"
                >
                  <option value="">+ Add Additional Subject</option>
                  {allMasterSubjects.map((s, i) => <option key={i} value={s}>{s}</option>)}
                </select>
            </div>

            <section className="space-y-4 pb-4">
              <div className="font-black text-blue-700 border-l-4 border-blue-700 pl-3 uppercase text-[11px] tracking-widest">{t.parentInfo}</div>
              <div className="grid md:grid-cols-2 gap-4">
                <input value={form.fatherName} readOnly placeholder="Father's Name" className="border-2 p-3.5 rounded-2xl bg-slate-50 font-bold text-slate-400 text-sm" />
                <input value={form.phone} readOnly placeholder="Mobile No" className="border-2 p-3.5 rounded-2xl bg-slate-50 font-bold text-slate-400 text-sm" />
              </div>
            </section>

            <button type="submit" disabled={loading} className="w-full py-5 bg-emerald-700 text-white rounded-[2rem] font-black shadow-xl shadow-emerald-200 uppercase tracking-widest hover:bg-emerald-800 transition-all active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none">
              {loading ? "SAVING PROMOTION..." : t.saveBtn}
            </button>
          </form>
        </div>
      ) : (
        <AdmissionDetails studentId={savedStudentId} subjects={subjects} onClose={() => { setShowPrint(false); close(); }} />
      )}
    </div>
  );
}