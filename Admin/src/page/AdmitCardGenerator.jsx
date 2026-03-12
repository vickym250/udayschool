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
  const [school, setSchool] = useState({
    name: "SUNSHINE ENGLISH MEDIUM SCHOOL",
    address: "",
    logoUrl: "",
    signatureUrl: "", // Naya field add kiya
  });

  const classOrder = [
    "Nursery", "LKG", "UKG",
    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
    "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"
  ];

  const getCurrentSession = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return currentMonth >= 3 ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}` : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
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

  // Logo aur Signature dono ke liye Base64 conversion
  const getBase64FromUrl = async (url) => {
    if (!url) return "";
    try {
      const data = await fetch(url);
      const blob = await data.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => resolve(reader.result);
      });
    } catch (e) {
      console.error("Asset fetch error:", e);
      return url; 
    }
  };

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

  const syncGlobalRollNumbers = async () => {
    const confirm = window.confirm("Bhai, kya aap pure school ke bacchon ka Roll Number 1 se start karke save karna chahte hain?");
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
      allStudents.forEach((stu, index) => {
        batch.update(doc(db, "students", stu.id), { examRollNo: index + 1 });
      });
      await batch.commit();
      alert(`✅ Done! Roll numbers set ho gaye.`);
    } catch (err) { alert("Error syncing!"); }
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

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "students"), where("className", "==", selectedClass), where("session", "==", selectedSession));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((stu) => !stu.deletedAt);
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

 const executePrint = async (studentList) => {
    if (studentList.length === 0) return;
    setIsPrinting(true);

    // Helper function to convert "Class 1" to "1st", "Class 2" to "2nd" etc.
    const getOrdinalClass = (className) => {
      if (!className) return "N/A";
      const match = className.match(/\d+/);
      if (!match) return className; // Nursery, LKG etc. ko as-is rakhega
      
      const n = parseInt(match[0]);
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      const suffix = s[(v - 20) % 10] || s[v] || s[0];
      return n + suffix;
    };

    try {
      // Logo aur Signature dono ko base64 mein convert kar rahe hain
      const logoBase64 = school.logoUrl ? await getBase64FromUrl(school.logoUrl) : "";
      const sigBase64 = school.signatureUrl ? await getBase64FromUrl(school.signatureUrl) : "";
      
      const ttSnap = await getDoc(doc(db, "Timetables", selectedClass));
      const ttData = ttSnap.exists() ? ttSnap.data() : {};
      const timetable = (ttData[selectedExam] || []).sort((a, b) => new Date(a.date) - new Date(b.date));
      
      const dbTimings = ttData.timings || { firstMtg: "09:00 AM - 12:00 PM", secondMtg: "01:00 PM - 04:00 PM" };

      let printFrame = document.getElementById("printFrameAdmit") || document.createElement("iframe");
      printFrame.id = "printFrameAdmit";
      printFrame.style.display = "none";
      document.body.appendChild(printFrame);

      const cardsHTML = studentList.map(stu => `
        <div class="admit-card">
          <div class="card-header">
             <div class="logo-box">
               ${logoBase64 ? `<img src="${logoBase64}"  />` : ''}
             </div>
             <div class="school-info">
               <h2 class="school-name ">${school.name.toUpperCase()}</h2>
               <p class="school-addr">${school.address || ''}</p>
               <p class="exam-title">${selectedExam.toUpperCase()} EXAMINATION ${selectedSession}</p>
             </div>
             <div class="admit-tag">ADMIT CARD</div>
          </div>

          <div class="main-body">
            <div class="photo-column">
              <div class="photo-box">
                ${stu.photoURL ? `<img src="${stu.photoURL}" />` : 'PHOTO'}
              </div>
            </div>

            <div class="details-column">
              <div class="detail-row"><span>Roll No:</span> <b class="roll-txt">${stu.examRollNo || 'N/A'}</b></div>
              <div class="detail-row"><span>Name:</span> <b>${stu.name?.toUpperCase()}</b></div>
              <div class="detail-row"><span>Father:</span> ${stu.fatherName?.toUpperCase()}</div>
              <div class="detail-row"><span>Class:</span> <b>${getOrdinalClass(stu.className)}</b></div>
            </div>

            <div class="timetable-column">
              <table class="tt-table">
                <thead>
                  <tr>
                    <th width="22%">Date</th>
                    <th width="15%">Day</th>
                    <th width="31.5%">1st Meeting</th>
                    <th width="31.5%">2nd Meeting</th>
                  </tr>
                </thead>
                <tbody>
                  ${timetable.map(t => {
                    const dateObj = new Date(t.date + 'T00:00:00'); 
                    const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
                    return `
                      <tr>
                        <td style="font-weight:bold; color: #1e3a8a;">${formattedDate}</td>
                        <td style="font-size: 8.5px;">${dayName}</td>
                        <td style="font-weight:bold;">${t.subject?.toUpperCase() || '---'}</td>
                        <td style="font-weight:bold;">${t.subject2?.toUpperCase() || '---'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="footer-section">
            <div class="timing-note">
               <div class="timing-section" style="margin-top: -130px;  padding-top: 5px;">
                  <div class="detail-row"><span>1st Shift:</span> <b>${dbTimings.firstMtg} Onwards</b></div>
                  <div class="detail-row"><span>2nd Shift:</span> <b>${dbTimings.secondMtg} Onwards</b></div>
                  <p style="font-size: 8px; color: #d32f2f; margin: 2px 0;">* Late entry will not be permitted after the bell.</p>
                  <div class="signature-row">
                    <div class="sig">Candidate Signature</div>
                  </div>
               </div>
            </div>

            <div class="siga">
              <div class="sig-img-container">
                ${sigBase64 ? `<img src="${sigBase64}" class="principal-sig-img" />` : ''}
              </div>
              Principal/Headmaster <br/> Signature
            </div>
          </div>
        </div>
      `).join('');

      const style = `
        <style>
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
          .admit-card {
            width: 210mm;
            min-height: 93mm;
            border-bottom: 1.5px dashed #444;
            padding: 8px 15px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            page-break-inside: avoid;
          }
          .card-header { display: flex; align-items: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; margin-bottom: 8px; position: relative; }
          .logo-box img { height: 56px; width: auto; max-width: 100px; margin-right: 15px; }
          .school-info { flex: 1; text-align: center; }
          .school-name { margin: 0; color: #1e3a8a; font-size: 25px; font-weight: 900; }
          .school-addr { margin: 0; font-size: 9px; color: #555; }
          .exam-title { margin: 2px 0; font-size: 11px; font-weight: bold; color: #d32f2f; background: #fff5f5; display: inline-block; padding: 0 10px; border-radius: 10px; }
          .admit-tag { background: #1e3a8a; color: #fff; padding: 4px 10px; font-size: 11px; font-weight: bold; border-radius: 4px; }
          .main-body { display: flex; flex: 1; gap: 10px; align-items: flex-start; }
          .photo-column { width: 75px; }
          .photo-box { width: 75px; height: 90px; border: 1px solid #1e3a8a; display: flex; align-items: center; justify-content: center; font-size: 8px; background: #f8fafc; overflow: hidden; }
          .photo-box img { width: 100%; height: 100%; object-fit: cover; }
          .details-column { width: 200px; font-size: 11px; display: flex; flex-direction: column; gap: 4px; }
          .detail-row { border-bottom: 1px solid #eee; padding: 2px 0; display: flex; }
          .detail-row span { width: 70px; color: #64748b; font-weight: 600; }
          .roll-txt { color: #d32f2f; font-size: 14px; }
          .timetable-column { flex: 1; }
          .tt-table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
          .tt-table th, .tt-table td { border: 1px solid #cbd5e1; padding: 4px; text-align: center; }
          .tt-table th { background: #f1f5f9; color: #1e3a8a; font-weight: bold; }
          .footer-section { margin-top: 5px; display: flex; justify-content: space-between; align-items: flex-end; }
          .timing-note { font-size: 10px; color: #1e3a8a; background: #eff6ff; padding: 3px 8px;  border-radius: 4px; }
          .signature-row { display: flex; gap: 40px;  margin-top:20px; }
          .sig { width: 120px; border-top: 1px solid #333; text-align: center; font-size: 9px; font-weight: bold; margin-top :10px;  }
          
          .siga { width: 120px; border-top: 1px solid #333; text-align: center; font-size: 9px; font-weight: bold; margin-bottom :0px; margin-top:25px; position: relative; }
          .sig-img-container { position: absolute; bottom: 5px; left: 0; width: 100%; display: flex; justify-content: center; pointer-events: none; }
          .principal-sig-img { height: 50px; width: auto; object-fit: contain; mix-blend-mode: multiply; }

          @media print { .admit-card:nth-child(3n) { page-break-after: always; } }
        </style>`;

      const win = printFrame.contentWindow;
      win.document.open();
      win.document.write(`<html><head>${style}</head><body>${cardsHTML}</body></html>`);
      win.document.close();

      const images = win.document.querySelectorAll('img');
      const promises = Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      });

      await Promise.all(promises);

      setTimeout(() => {
        setIsPrinting(false);
        win.focus();
        win.print();
      }, 800);
    } catch (err) {
      setIsPrinting(false);
      alert("Print failed!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 relative">
      {isPrinting && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <div className="w-12 h-12 border-4 border-t-indigo-500 border-white/20 rounded-full animate-spin mb-4"></div>
          <p className="font-bold tracking-widest animate-pulse uppercase italic">Generating Cards...</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-lg mb-6 no-print">
        <div className="flex flex-wrap gap-4 justify-between items-center uppercase italic">
          <div>
            <h1 className="text-xl font-black text-indigo-900">ADMIT CARD GENERATOR</h1>
            <p className="text-xs text-slate-400 font-bold tracking-widest">{school.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={resetAllRollNumbers} className="bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md hover:bg-red-600 transition-all">RESET ROLLS</button>
            <button onClick={syncGlobalRollNumbers} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md hover:bg-emerald-700 transition-all">SYNC (1-1000)</button>
            <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} className="border p-2 rounded-xl text-xs font-bold">{examTypes.map(t => <option key={t} value={t}>{t}</option>)}</select>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="border p-2 rounded-xl text-xs font-bold">{availableClasses.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <button
              onClick={() => executePrint(students)}
              disabled={!timetableExists || students.length === 0 || isPrinting}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase shadow-lg hover:bg-indigo-700 transition-all disabled:bg-slate-400"
            >
              {isPrinting ? "Processing..." : "Print Class Cards"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden no-print">
        {loading ? <div className="p-20 text-center animate-pulse text-indigo-900 font-black italic uppercase tracking-widest">Loading Students...</div> : (
          <table className="w-full text-left uppercase italic">
            <thead className="bg-indigo-900 text-white text-[10px] font-black tracking-widest">
              <tr><th className="p-4">EXAM ROLL</th><th className="p-4">STUDENT NAME</th><th className="p-4 text-right">ACTION</th></tr>
            </thead>
            <tbody className="divide-y text-xs font-bold">
              {students.map(stu => (
                <tr key={stu.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-red-600">#{stu.examRollNo || '---'}</td>
                  <td className="p-4 text-slate-700">{stu.name}</td>
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdmitCardGenerator;