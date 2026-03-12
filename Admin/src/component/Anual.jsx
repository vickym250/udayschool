import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";

export default function MarksSheet() {
  const { studentId, session } = useParams();
  const [loading, setLoading] = useState(true);
  const [classResults, setClassResults] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  const [schoolInfo, setSchoolInfo] = useState({
    name: "Dr. A. P. J. Abdul Kalam Memorial Kid's Academy",
    address: "Barhni (opp. Cold Storage), Post- Kathawtiya Alam, Dumariyaganj, Siddharth Nagar - 272189",
    mobile: "9918488912",
    website: "https://drapjacademy.in",
    logoUrl: "",
    signatureUrl: "" // Naya field for Signature
  });

  const TABLE_ROWS_COUNT = 8; 
  const normalize = (str = "") => str.toLowerCase().replace(/[^a-z]/g, "");

  const calculateGrade = (per) => {
    if (per >= 90) return "A1";
    if (per >= 80) return "A2";
    if (per >= 70) return "B1";
    if (per >= 60) return "B2";
    if (per >= 50) return "C1";
    if (per >= 40) return "C2";
    if (per >= 33) return "D";
    return "E";
  };

  const getRow = (exam, subject) => {
    if (!exam || !exam.rows) return { total: 0, marks: 0 };
    const found = exam.rows.find(
      (r) => normalize(r.subject) === normalize(subject)
    );
    return found || { total: 0, marks: 0 };
  };

  // Assets ko Base64 mein badalne ke liye function (Print logic ke liye zaroori hai)
  const getBase64FromUrl = async (url) => {
    if (!url) return "";
    try {
      const response = await fetch(url);
      const blob = await response.blob();
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

  const handlePrint = async () => {
    // Logo aur Signature dono ko Base64 mein convert kar rahe hain taaki print window mein gayab na hon
    const logoBase64 = schoolInfo.logoUrl ? await getBase64FromUrl(schoolInfo.logoUrl) : "";
    const sigBase64 = schoolInfo.signatureUrl ? await getBase64FromUrl(schoolInfo.signatureUrl) : "";

    const content = document.getElementById("marksheet-content").innerHTML;
    const printWindow = window.open("", "_blank", "width=1100,height=1400");
    printWindow.document.write(`
      <html>
        <head>
          <title>Print - ${schoolInfo.name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
            body { margin: 0; padding: 0; background: #fff; font-family: 'Roboto', sans-serif; overflow: hidden; }
            .print-page { 
              width: 210mm; 
              height: 297mm; 
              padding: 5mm; 
              margin: 0 auto;
              background: white;
              page-break-after: always; 
              display: flex; 
              flex-direction: column;
            }
            .main-border { 
              border: 4px double #1e3a8a; 
              height: 100%; 
              width: 100%; 
              padding: 4mm; 
              display: flex; 
              flex-direction: column; 
              border-radius: 4px;
            }
            table { border-collapse: collapse; width: 100%; margin-top: 5px; }
            table td, table th { border: 1.5px solid #1e3a8a !important; padding: 3px 5px !important; font-size: 10.5px; font-weight: 900; }
            .info-line { display: flex; border-bottom: 1px dashed #1e3a8a; padding-bottom: 1px; margin-bottom: 4px; align-items: center; }
            .info-label { width: 120px; font-size: 10px; color: #1e3a8a; font-weight: 900; text-transform: uppercase; }
            .info-value { font-size: 12px; color: #000; font-weight: 900; text-transform: uppercase; flex: 1; }
            .header-school-name { color: #800000; font-size: 24px; font-weight: 900; text-transform: uppercase; line-height: 1; }
            .header-subtext { color: #1e40af; font-size: 10px; font-weight: 700; }
            .banner-strip {
              background-color: #7dd3fc;
              color: #1e3a8a;
              text-align: center;
              font-weight: 900;
              font-size: 16px;
              padding: 4px 0;
              margin: 8px 0;
              text-transform: uppercase;
              -webkit-print-color-adjust: exact;
              border: 1.5px solid #1e3a8a;
            }
            .result-box { border: 1.5px solid #1e3a8a; background: #f0f9ff !important; -webkit-print-color-adjust: exact; }
            
            /* Signature Styling */
            .sig-container { position: relative; width: 150px; text-align: center;  bottom: 20px;   }
            .principal-sig-img { 
               position: absolute; 
               bottom: 20px; 
               left: 50%; 
               transform: translateX(-50%); 
               height: 45px; 
               width: auto; 
               mix-blend-mode: multiply; 
            }
          </style>
        </head>
        <body>
          <div class="print-container">${content}</div>
          <script>
            // Replace current assets with Base64 in the print window
            const logo = document.querySelectorAll('.school-logo-img');
            logo.forEach(img => img.src = "${logoBase64}");
            
            const sigs = document.querySelectorAll('.principal-sig-img');
            sigs.forEach(img => img.src = "${sigBase64}");

            window.onload = () => {
              setTimeout(() => { window.print(); window.close(); }, 800);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const sRef = doc(db, "settings", "schoolDetails");
      const sSnap = await getDoc(sRef);
      if (sSnap.exists()) setSchoolInfo(sSnap.data());

      const lowerId = studentId?.toLowerCase() || "";
      const isBulk = lowerId.includes("class") || ["lkg", "ukg", "nursery"].includes(lowerId);

      if (isBulk) {
        let sName = lowerId === "lkg" ? "LKG" : lowerId === "ukg" ? "UKG" : studentId.replace(/class/i, "Class ").trim();
        const mSnap = await getDoc(doc(db, "school_config", "master_data"));
        if (mSnap.exists()) {
          const mapping = mSnap.data().mapping || {};
          setSubjects(mapping[sName] || mapping["Class "+sName] || []);
        }
        const stuSnap = await getDocs(query(collection(db, "students"), where("className", "==", sName)));
        const students = stuSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const all = [];
        for (const stu of students) {
          const rSnap = await getDocs(query(collection(db, "examResults"), where("studentId", "==", stu.id), where("session", "==", session)));
          const resDocs = rSnap.docs.map(d => d.data());
          const h = resDocs.find(r => r.exam === "Half-Yearly");
          const a = resDocs.find(r => r.exam === "Annual");
          if (h || a) {
            all.push({ student: stu, half: h, annual: a, srNo: a?.srNo || h?.srNo || "---" });
          }
        }
        all.sort((x, y) => (x.student.examRollNo || 0) - (y.student.examRollNo || 0));
        setClassResults(all);
      } else {
        const stuSnap = await getDoc(doc(db, "students", studentId));
        if (stuSnap.exists()) {
          const stu = stuSnap.data();
          const mSnap = await getDoc(doc(db, "school_config", "master_data"));
          if (mSnap.exists()) setSubjects(mSnap.data().mapping[stu.className] || []);
          const rSnap = await getDocs(query(collection(db, "examResults"), where("studentId", "==", studentId), where("session", "==", session)));
          const resDocs = rSnap.docs.map(d => d.data());
          setClassResults([{ 
            student: { id: studentId, ...stu }, 
            half: resDocs.find(r => r.exam === "Half-Yearly"), 
            annual: resDocs.find(r => r.exam === "Annual"), 
            srNo: resDocs[0]?.srNo || "---" 
          }]);
        }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [studentId, session]);

  if (loading) return <div className="p-20 text-center font-black text-indigo-600">LOADING MARKSHEETS...</div>;

  return (
    <div className="bg-slate-900 min-h-screen p-4 md:p-10 print:p-0 text-slate-900">
      <div id="marksheet-content" className="flex flex-col items-center">
        {classResults.map((item) => {
          const { student, half, annual, srNo } = item;
          const dob = annual?.dob || half?.dob || student?.dob || "---";
          const roll = annual?.examRollNo || half?.examRollNo || student?.examRollNo || "---";

          const getMarks = (sub) => {
            const h = getRow(half, sub);
            const a = getRow(annual, sub);
            return { hMax: Number(h.total) || 50, hObt: Number(h.marks) || 0, aMax: Number(a.total) || 50, aObt: Number(a.marks) || 0 };
          };

          const tHMax = subjects.reduce((s, sub) => s + getMarks(sub).hMax, 0);
          const tHObt = subjects.reduce((s, sub) => s + getMarks(sub).hObt, 0);
          const tAMax = subjects.reduce((s, sub) => s + getMarks(sub).aMax, 0);
          const tAObt = subjects.reduce((s, sub) => s + getMarks(sub).aObt, 0);
          const gMax = tHMax + tAMax;
          const gObt = tHObt + tAObt;

          const finalPercentage = gMax > 0 ? ((gObt / gMax) * 100).toFixed(2) : 0;
          const finalGrade = calculateGrade(finalPercentage);
          const resultStatus = finalPercentage >= 33 ? "PASSED" : "FAILED";

          return (
            <div key={student.id} className="print-page shadow-2xl mb-10 bg-white">
              <div className="main-border">
                {/* Header Section */}
                <div className="flex items-center w-full gap-2">
                   {schoolInfo.logoUrl && <img src={schoolInfo.logoUrl} className="school-logo-img w-16 h-16 object-contain" alt="logo" />}
                   <div className="flex-1 text-center">
                      <h1 className="header-school-name text-2xl">{schoolInfo.name}</h1>
                      <p className="header-subtext uppercase text-[13px]">{schoolInfo.address}</p>
                      <p className="header-subtext uppercase text-[11px] ">Mob: {schoolInfo.contact}</p>
                      <p className="header-subtext uppercase text-[11px] ">Website: {schoolInfo.website}</p>
                   </div>
                </div>

                <div className="banner-strip">
                   Annual Report Card - Session : {session}
                </div>

                <div className="flex justify-between items-center mb-2 px-1">
                   <div className="text-[20px] font-black text-blue-900">SR. NO.: {srNo}</div>
                   <div className="text-[20px] font-black text-blue-900 px-3 py-0.5 bg-amber-300 border border-blue-900">ROLL NO.: {roll}</div>
                </div>

                {/* Personal Info */}
                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <div className="info-line"><span className="info-label">Name:</span><span className="info-value text-blue-900">{student.name}</span></div>
                    <div className="info-line"><span className="info-label">Father's Name:</span><span className="info-value">{student.fatherName}</span></div>
                    <div className="info-line"><span className="info-label">Mother's Name:</span><span className="info-value">{student.motherName || "---"}</span></div>
                    <div className="flex gap-2">
                      <div className="info-line flex-1"><span className="info-label" style={{width:'60px'}}>Class:</span><span className="info-value">{student.className}</span></div>
                      <div className="info-line flex-1"><span className="info-label" style={{width:'60px'}}>D.O.B:</span><span className="info-value">{dob}</span></div>
                    </div>
                    <div className="info-line"><span className="info-label">Address:</span><span className="info-value">{student.address || "---"}</span></div>
                  </div>
                  <div className="w-20 h-24 border-2 border-blue-900 p-0.5 bg-white shadow-sm">
                    <img src={student.photoURL || student.photo || "/placeholder-student.png"} className="w-full h-full object-cover" alt="student" />
                  </div>
                </div>

                {/* Table Section */}
                <div className="flex-grow">
                  <table className="text-center text-2xl">
                    <thead className="bg-blue-900 text-white">
                      <tr>
                        <th rowSpan="2" className="w-6">SN</th>
                        <th rowSpan="2" className="text-left px-2">SUBJECTS</th>
                        <th colSpan="2" className="py-0.5 uppercase">Half Yearly</th>
                        <th colSpan="2" className="py-0.5 uppercase">Annual Exam</th>
                        <th rowSpan="2" className="bg-blue-800 uppercase">Grand Total</th>
                      </tr>
                      <tr className="text-[8px] bg-blue-700">
                        <th className="w-12">MAX</th><th className="w-12">OBT</th>
                        <th className="w-12">MAX</th><th className="w-12">OBT</th>
                      </tr>
                    </thead>
                    <tbody className="uppercase font-black text-blue-900">
                      {subjects.map((sub, i) => {
                        const m = getMarks(sub);
                        return (
                          <tr key={i} className="h-7">
                            <td className="bg-slate-50">{i+1}</td>
                            <td className="text-left px-2 text-[10px]">{sub}</td>
                            <td className="text-gray-400">{m.hMax}</td><td className="text-black">{m.hObt}</td>
                            <td className="text-gray-400">{m.aMax}</td><td className="text-black">{m.aObt}</td>
                            <td className="bg-blue-50 text-[11px]">{m.hObt + m.aObt}</td>
                          </tr>
                        );
                      })}
                      {Array.from({ length: Math.max(0, TABLE_ROWS_COUNT - subjects.length) }).map((_, i) => (
                        <tr key={i} className="h-7"><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-900 text-white font-black">
                      <tr className="h-8">
                        <td colSpan="2" className="text-right px-4 text-[10px]">TOTAL</td>
                        <td>{tHMax}</td><td>{tHObt}</td>
                        <td>{tAMax}</td><td>{tAObt}</td>
                        <td className="bg-yellow-400 text-blue-900 text-[12px]">{gObt} / {gMax}</td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Summary Bar */}
                  <div className="flex gap-2 mt-3">
                    <div className="flex-1 result-box p-1.5 text-center rounded">
                      <div className="text-[9px] font-black text-blue-900">PERCENTAGE</div>
                      <div className="text-base font-black text-blue-900">{finalPercentage}%</div>
                    </div>
                    <div className="flex-1 result-box p-1.5 text-center rounded">
                      <div className="text-[9px] font-black text-blue-900">GRADE</div>
                      <div className="text-base font-black text-red-700">{finalGrade}</div>
                    </div>
                    <div className="flex-1 result-box p-1.5 text-center rounded">
                      <div className="text-[9px] font-black text-blue-900">RESULT</div>
                      <div className="text-base font-black text-green-700">{resultStatus}</div>
                    </div>
                  </div>

                  {/* Co-Scholastic & Grading Scale */}
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="border border-blue-900 overflow-hidden rounded">
                      <div className="bg-blue-900 text-white text-[9px] font-black px-2 py-0.5 uppercase">Co-Scholastic</div>
                      <table className="m-0 border-none">
                        <tbody>
                          <tr className="border-b border-blue-900"><td className="text-left border-none px-2 py-1">Work Education</td><td className="w-10 text-center font-black border-none bg-blue-50">A</td></tr>
                          <tr className="border-b border-blue-900"><td className="text-left border-none px-2 py-1">Health & Physical</td><td className="w-10 text-center font-black border-none bg-blue-50">A</td></tr>
                          <tr><td className="text-left border-none px-2 py-1">Discipline</td><td className="w-10 text-center font-black border-none bg-blue-50">A</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="border border-blue-900 overflow-hidden rounded">
                      <div className="bg-blue-900 text-white text-[9px] font-black px-2 py-0.5 uppercase">Grading Scale</div>
                      <div className="grid grid-cols-2 text-[8px] font-black p-2 gap-x-2 gap-y-0.5 bg-slate-50 h-full text-[13px] content-center">
                        <div>90%+= A1</div><div>80%+= A2</div>
                        <div>70%+= B1</div><div>60%+= B2</div>
                        <div>50%+= C1</div><div>40%+= C2</div>
                        <div>33%+= D</div><div>0%+= E</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Section - Signature Logic Added */}
                <div className="flex justify-between items-end mt-2 pt-4 px-2 pb-2">
                  <div className="text-center mb-10">
                    <div className="w-32 border-t border-blue-900 mb-1"></div>
                    <p className="text-[10px] font-black uppercase text-blue-900">Class Teacher</p>
                  </div>
                  <div className="w-16 h-16 border border-dashed border-blue-900 rounded-full flex items-center justify-center opacity-20">
                    <span className="text-[8px] font-bold text-blue-900">SEAL</span>
                  </div>
                  
                  {/* Principal Signature Area */}
                  <div className="sig-container">
                    {schoolInfo.signatureUrl && (
                      <img src={schoolInfo.signatureUrl} className="principal-sig-img" alt="Principal Signature" />
                    )}
                    <div className="w-40 border-t border-blue-900 mb-1 mx-auto"></div>
                    <p className="text-[10px] font-black uppercase text-blue-900">
                      Signature <br /> Principal/HeadMaster
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-10 right-10 flex gap-4 print:hidden">
        <button onClick={() => window.location.reload()} className="bg-white border-2 border-blue-900 text-blue-900 font-black px-8 py-2 rounded-full shadow-lg">
          REFRESH
        </button>
        <button onClick={handlePrint} className="bg-blue-900 text-white font-black px-12 py-3 rounded-full shadow-2xl hover:scale-105 transition-transform">
          PRINT FULL A4 CARDS
        </button>
      </div>
    </div>
  );
}