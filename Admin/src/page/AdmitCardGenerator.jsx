import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";

const AdmitCardGenerator = () => {
  // --- States ---
  const [school, setSchool] = useState({
    name: "SUNSHINE ENGLISH MEDIUM SCHOOL",
    address: "",
    logoUrl: "",
    signatureUrl: "",
  });

  const classOrder = [
     "LKG", "UKG",
    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
    "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"
  ];

  const getCurrentSession = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return currentMonth >= 3 
      ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}` 
      : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
  };

  const [selectedClass, setSelectedClass] = useState("Class 1");
  const [selectedSession, setSelectedSession] = useState(getCurrentSession());
  const [selectedExam, setSelectedExam] = useState("Half-Yearly");
  const [students, setStudents] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [timetableExists, setTimetableExists] = useState(false);

  const examTypes = ["Quarterly", "Half-Yearly", "Annual", "Pre-Board"];
  const sessionOptions = ["2023-24", "2024-25", "2025-26", "2026-27"];

  // --- Fixed Image Helper ---
  const getBase64FromUrl = (url) => {
    return new Promise((resolve) => {
      if (!url) return resolve("");
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous"); 
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => {
        console.error("Image load failed:", url);
        resolve(url); 
      };
      img.src = url;
    });
  };

  // --- Effects ---
  useEffect(() => {
    const fetchSchool = async () => {
      const snap = await getDoc(doc(db, "settings", "schoolDetails"));
      if (snap.exists()) setSchool(snap.data());
    };
    fetchSchool();

    const unsubClasses = onSnapshot(collection(db, "classes"), (snapshot) => {
      const classData = snapshot.docs.map(d => (d.data().name || d.data().className || "").trim());
      const sorted = classData.sort((a, b) => {
        const indexA = classOrder.findIndex(c => c.toUpperCase() === a.toUpperCase());
        const indexB = classOrder.findIndex(c => c.toUpperCase() === b.toUpperCase());
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
      setAvailableClasses(sorted);
    });

    return () => unsubClasses();
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "students"), 
      where("className", "==", selectedClass), 
      where("session", "==", selectedSession)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((stu) => !stu.deletedAt);
      
      setStudents(data.sort((a, b) => (a.examRollNo || 0) - (b.examRollNo || 0)));
      setLoading(false);
    });

    const checkTT = async () => {
      const ttSnap = await getDoc(doc(db, "Timetables", selectedClass));
      setTimetableExists(ttSnap.exists() && ttSnap.data()[selectedExam]?.length > 0);
    };

    checkTT();
    return unsub;
  }, [selectedClass, selectedSession, selectedExam]);

  // --- Handlers ---
 const syncGlobalRollNumbers = async () => {
    const confirm = window.confirm(`Bhai, kya aap LKG se Roll Number 1 shuru karna chahte hain? (Nursery skip ho jayegi)`);
    if (!confirm) return;
    setLoading(true);

    try {
      const q = query(collection(db, "students"), where("session", "==", selectedSession));
      const snap = await getDocs(q);
      let allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => !s.deletedAt);

      allStudents.sort((a, b) => {
        const indexA = classOrder.findIndex(c => c.toUpperCase() === (a.className || "").trim().toUpperCase());
        const indexB = classOrder.findIndex(c => c.toUpperCase() === (b.className || "").trim().toUpperCase());
        if (indexA !== indexB) return indexA - indexB;
        return a.name.localeCompare(b.name);
      });

      const batch = writeBatch(db);
      let currentRoll = 1;
      let startCounting = false;

      allStudents.forEach((stu) => {
        const className = (stu.className || "").trim().toUpperCase();
        if (className === "LKG") { startCounting = true; }

        if (startCounting) {
          batch.update(doc(db, "students", stu.id), { examRollNo: currentRoll });
          currentRoll++;
        } else {
          batch.update(doc(db, "students", stu.id), { examRollNo: null });
        }
      });

      await batch.commit();
      alert(`✅ Done! LKG se Roll Number 1 shuru ho gaya hai.`);
    } catch (err) { 
      console.error(err);
      alert("Error syncing!"); 
    }
    setLoading(false);
  };

  const resetAllRollNumbers = async () => {
    const confirm = window.confirm("Bhai, RESET karna chahte hain?");
    if (!confirm) return;
    setLoading(true);
    try {
      const q = query(collection(db, "students"), where("session", "==", selectedSession));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.update(doc(db, "students", d.id), { examRollNo: null }));
      await batch.commit();
      alert("✅ Reset Completed!");
    } catch (err) { alert("Reset failed!"); }
    setLoading(false);
  };

  const executePrint = async (studentList) => {
    if (studentList.length === 0) return;
    setIsPrinting(true);

    try {
      const logoImg = await getBase64FromUrl(school.logoUrl);
      const sigImg = await getBase64FromUrl(school.signatureUrl);
      
      const ttSnap = await getDoc(doc(db, "Timetables", selectedClass));
      const ttData = ttSnap.exists() ? ttSnap.data() : {};
      const timetable = (ttData[selectedExam] || []).sort((a, b) => new Date(a.date) - new Date(b.date));
      const dbTimings = ttData.timings || { firstMtg: "09:00 AM", secondMtg: "01:00 PM" };

      let printFrame = document.getElementById("printFrameAdmit") || document.createElement("iframe");
      printFrame.id = "printFrameAdmit";
      printFrame.style.display = "none";
      document.body.appendChild(printFrame);

      const cardsHTML = studentList.map(stu => `
        <div class="admit-card">
          <div class="card-header">
             <div class="logo-box">
               ${logoImg ? `<img src="${logoImg}" />` : ''}
             </div>
             <div class="school-info">
               <h2 class="school-name ">${school.name.toUpperCase()}</h2>
               <p class="school-addr">${school.address || ''}</p>
               <p class="exam-title">${selectedExam.toUpperCase()} EXAMINATION ${selectedSession}</p>
             </div>
             <div class="admit-tag">ADMIT CARD</div>
          </div>

          <div class="main-body">
            <div class="left-pane">
              <div class="photo-box">
                ${stu.photoURL ? `<img src="${stu.photoURL}" />` : 'PHOTO'}
              </div>
              <div class="details-mini">
                <div class="row"><span>Roll No:</span> <b style="color:#d32f2f">#${stu.examRollNo || 'N/A'}</b></div>
                <div class="row"><span>Name:</span> <b>${stu.name?.toUpperCase()}</b></div>
                <div class="row"><span>Class:</span> <b>${stu.className}</b></div>
                <div class="row"><span>Father:</span> ${stu.fatherName?.toUpperCase() || ''}</div>
              </div>
            </div>

            <div class="right-pane">
              <table class="tt-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>1st Shift</th>
                    <th>2nd Shift</th>
                  </tr>
                </thead>
                <tbody>
                  ${timetable.map(t => { 
                    const dateObj = new Date(t.date + 'T00:00:00'); 
                    const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                    const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
                    return `
                      <tr>
                        <td style="font-weight:bold;">${formattedDate}</td>
                        <td style="font-size: 7px;">${dayName}</td>
                        <td>${t.subject?.toUpperCase() || '-'}</td>
                        <td>${t.subject2?.toUpperCase() || '-'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="footer-section">
            <div class="timing-box">
               Timing: 1st: ${dbTimings.firstMtg} | 2nd: ${dbTimings.secondMtg}
               <br/>* Bring this card daily. Entry closed 15 min before.
            </div>
            <div class="sigs">
               <div class="sig-item">Candidate</div>
               <div class="sig-item">
                 <div class="sig-img-wrap">
                   ${sigImg ? `<img src="${sigImg}" />` : ''}
                 </div>
                 Principal
               </div>
            </div>
          </div>
        </div>
      `).join('');

      const style = `
        <style>
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #fff; }
          
          .admit-card {
            width: 210mm;
            height: 99mm; 
            border-bottom: 1px dashed #444;
            padding: 5mm 10mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            page-break-inside: avoid;
            position: relative;
          }

          .card-header { display: flex; align-items: center; border-bottom: 1.5px solid #1e3a8a; padding-bottom: 3px; margin-bottom: 5px; }
          .logo-box img { height: 38px; width: auto; margin-right: 10px; }
          .school-info { flex: 1; text-align: center; }
          .school-name { margin: 0; color: #1e3a8a; font-size: 15px; font-weight: 900; line-height: 1.1; }
          .school-addr { margin: 1px 0; font-size: 7px; color: #555; }
          .exam-title { margin: 1px 0; font-size: 8px; font-weight: bold; color: #d32f2f; background: #fff5f5; padding: 1px 8px; border-radius: 4px; display: inline-block; }
          .admit-tag { background: #1e3a8a; color: #fff; padding: 2px 6px; font-size: 8px; font-weight: bold; border-radius: 3px; }

          .main-body { display: flex; gap: 8px; flex: 1; min-height: 0; }
          .left-pane { width: 55mm; }
          .photo-box { width: 25mm; height: 30mm; border: 1px solid #1e3a8a; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; font-size: 7px; background: #f8fafc; overflow: hidden; }
          .photo-box img { width: 100%; height: 100%; object-fit: cover; }
          .details-mini { font-size: 9px; line-height: 1.3; }
          .row { border-bottom: 0.5px solid #eee; display: flex; padding: 1px 0; }
          .row span { width: 45px; color: #64748b; font-weight: 600; }

          .right-pane { flex: 1; }
          .tt-table { width: 100%; border-collapse: collapse; font-size: 8px; }
          .tt-table th, .tt-table td { border: 0.5px solid #cbd5e1; padding: 2px; text-align: center; }
          .tt-table th { background: #f1f5f9; color: #1e3a8a; font-weight: bold; }

          .footer-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-top: 3px; }
          .timing-box { font-size: 10px; color: #1e3a8a; font-weight: bold; line-height: 1.2; }
          .sigs { display: flex; gap: 20px; text-align: center; font-size: 8px; font-weight: bold; }
          .sig-item { width: 30mm; border-top: 0.5px solid #333; padding-top: 2px; position: relative; }
          .sig-img-wrap { position: absolute; bottom: 12px; left: 0; width: 100%; height: 25px; display: flex; justify-content: center; }
          .sig-img-wrap img { height: 100%; width: auto; mix-blend-mode: multiply; }

          @media print {
            .admit-card:nth-child(3n) { page-break-after: always; border-bottom: none; }
          }
        </style>`;

      const win = printFrame.contentWindow;
      win.document.open();
      win.document.write(`<html><head>${style}</head><body>${cardsHTML}</body></html>`);
      win.document.close();

      const images = win.document.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      }));

      setTimeout(() => {
        setIsPrinting(false);
        win.focus();
        win.print();
      }, 500);
    } catch (err) {
      console.error(err);
      setIsPrinting(false);
      alert("Print failed!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 relative">
      {isPrinting && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <div className="w-12 h-12 border-4 border-t-indigo-500 border-white/20 rounded-full animate-spin mb-4"></div>
          <p className="font-bold tracking-widest animate-pulse uppercase italic">Generating 3 Cards Per Page...</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-lg mb-6 no-print">
        <div className="flex flex-wrap gap-4 justify-between items-center uppercase italic">
          <div>
            <h1 className="text-xl font-black text-indigo-900">3-IN-1 ADMIT CARD GENERATOR</h1>
            <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">{school.name}</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button onClick={resetAllRollNumbers} className="bg-red-500 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase shadow-md hover:bg-red-600 transition-all">RESET ROLLS</button>
            <button onClick={syncGlobalRollNumbers} className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase shadow-md hover:bg-emerald-700 transition-all">SYNC ROLLS</button>
            
            <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="border p-2 rounded-xl text-xs font-bold bg-slate-50">
              {sessionOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} className="border p-2 rounded-xl text-xs font-bold">
              {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="border p-2 rounded-xl text-xs font-bold">
              {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <button
              onClick={() => executePrint(students)}
              disabled={!timetableExists || students.length === 0 || isPrinting}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase shadow-lg hover:bg-indigo-700 transition-all disabled:bg-slate-400"
            >
              Print Class (3 per page)
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden no-print">
        {loading ? (
          <div className="p-20 text-center animate-pulse text-indigo-900 font-black italic uppercase tracking-widest">
            Loading {selectedClass} Students...
          </div>
        ) : (
          <table className="w-full text-left uppercase italic">
            <thead className="bg-indigo-900 text-white text-[10px] font-black tracking-widest">
              <tr>
                <th className="p-4">EXAM ROLL</th>
                <th className="p-4">STUDENT NAME</th>
                <th className="p-4">SESSION</th>
                <th className="p-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs font-bold">
              {students.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-slate-400">No active students found.</td>
                </tr>
              ) : (
                students.map(stu => (
                  <tr key={stu.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-red-600 font-black">#{stu.examRollNo || '---'}</td>
                    <td className="p-4 text-slate-700">{stu.name}</td>
                    <td className="p-4 text-slate-400 font-normal">{stu.session}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => executePrint([stu])}
                        disabled={isPrinting}
                        className="text-indigo-600 font-black hover:underline disabled:text-slate-400"
                      >
                        Print Single
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdmitCardGenerator;