import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase'; 
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function AllReport() {
  const { className, session } = useParams(); 
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [school, setSchool] = useState({
    name: "Sun Shine School",
    address: "Mahanua",
    affiliation: "UP BOARD",
    contact: "234565467",
    logoUrl: ""
  });

  const TABLE_ROWS_COUNT = 10;

  useEffect(() => {
    let isMounted = true;
    const fetchResults = async () => {
      if (!className || !session) return;
      
      try {
        setLoading(true);
        const schoolSnap = await getDoc(doc(db, "settings", "schoolDetails"));
        if (schoolSnap.exists() && isMounted) setSchool(schoolSnap.data());

        const paramValue = className.toLowerCase().trim();
        
        // Logic: Check if parameter is a Class Name or a Student ID
        const isClassRequest = 
          paramValue.includes("class") || 
          ["lkg", "ukg", "nursery"].includes(paramValue);

        let q;
        const resultsRef = collection(db, "examResults");

        if (isClassRequest) {
          let dbClassName = className;
          if (className.startsWith("Class") && !className.includes(" ")) {
            dbClassName = className.replace("Class", "Class ");
          } else if (!className.startsWith("Class") && !["lkg", "ukg", "nursery"].includes(paramValue)) {
            dbClassName = `Class ${className}`;
          }

          q = query(
            resultsRef, 
            where("className", "==", dbClassName),
            where("session", "==", session),
            where("exam", "==", "Half-Yearly"),
            where("delete_at", "==", null) // SIRF NULL WALA DATA FETCH KAREGA
          );
        } else {
          q = query(
            resultsRef, 
            where("studentId", "==", className), 
            where("session", "==", session),
            where("exam", "==", "Half-Yearly"),
            where("delete_at", "==", null) // SIRF NULL WALA DATA FETCH KAREGA
          );
        }
        
        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() });
        });

        // SORTING: Numeric sort by SR NO
        results.sort((a, b) => (parseInt(a.srNo) || 999) - (parseInt(b.srNo) || 999));
        
        if (isMounted) setData(results);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchResults();
    return () => { isMounted = false; };
  }, [className, session]);

  const handlePrint = () => {
    window.print();
  };

  const onClose = () => navigate(-1);

  if (loading) return (
    <div className="fixed inset-0 bg-zinc-900 flex flex-col items-center justify-center text-white italic">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="tracking-widest font-bold uppercase">Preparing Reports...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-800 p-4 md:p-10 overflow-y-auto">
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          #printable-area, #printable-area * { visibility: visible !important; }
          #printable-area { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          @page { size: A4 portrait; margin: 0; }
          .page-break { 
            width: 210mm !important; 
            height: 297mm !important; 
            padding: 10mm !important; 
            box-sizing: border-box !important; 
            page-break-after: always !important; 
            background: white !important;
            box-shadow: none !important;
            display: flex !important;
            flex-direction: column !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .main-border { 
            border: 12px double #1e3a8a !important; 
            height: 100% !important;
            width: 100% !important;
            padding: 8mm !important; 
            box-sizing: border-box !important;
          }
          table td, table th { border: 1.5px solid #1e3a8a !important; }
        }
      `}} />

      <div className="fixed bottom-10 right-10 flex flex-col gap-4 z-[1000] no-print">
        <button onClick={handlePrint} className="px-8 py-3 bg-emerald-600 text-white font-black rounded-full shadow-2xl border-2 border-white/20 hover:scale-105 transition-all">
          🖨️ PRINT {data.length === 1 ? "REPORT" : `ALL (${data.length})`}
        </button>
        <button onClick={onClose} className="px-8 py-3 bg-white text-red-600 font-black rounded-full shadow-2xl border-2 border-red-100">
          CLOSE
        </button>
      </div>

      <div id="printable-area" className="w-full flex flex-col items-center gap-10">
        {data.length === 0 ? (
           <div className="text-white bg-zinc-900/50 p-10 rounded-xl text-center">
             <h2 className="text-2xl font-bold uppercase italic">No Result Found</h2>
             <p className="text-zinc-400">Please check the ID or Class name in the URL, or ensure data is not deleted.</p>
           </div>
        ) : (
          data.map((student, idx) => {
            const rows = student.rows || [];
            const grandTotalObt = rows.reduce((s, r) => s + (Number(r.marks) || 0), 0);
            const grandTotalMax = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
            const percent = grandTotalMax ? ((grandTotalObt / grandTotalMax) * 100).toFixed(2) : "0.00";
            const gradeStatus = Number(percent) >= 33 ? "PASS" : "FAIL";

            return (
              <div key={student.id || idx} className="page-break bg-white shadow-2xl flex flex-col text-slate-900">
                <div className="main-border">
                  {/* HEADER */}
                  <div className="flex items-center justify-between border-b-4 border-blue-900 pb-4 mb-6 relative">
                    <div className="w-20 h-20 flex-shrink-0">
                      <img src={school.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 text-center px-2">
                      <p className="text-blue-800 font-black text-[10px] uppercase tracking-[0.2em]">Affiliated: {school.affiliation}</p>
                      <h1 className="text-2xl font-black uppercase text-blue-900 leading-tight">{school.name}</h1>
                      <p className="text-[10px] font-bold text-gray-700 uppercase">{school.address}</p>
                      <p className="text-[10px] font-bold text-blue-700">📞 {school.contact}</p>
                    </div>
                    <div className="w-20 text-right">
                      <span className="text-[10px] font-bold text-gray-400 block uppercase italic">Session</span>
                      <span className="text-lg font-black text-blue-900">{student.session}</span>
                    </div>
                    <div className="absolute top-0 right-0">
                      <p className="text-[10px] font-black text-[#1e3a8a] border border-[#1e3a8a] px-2 py-0.5 bg-slate-50">SR. NO: {student.srNo || '---'}</p>
                    </div>
                  </div>

                  {/* STUDENT INFO */}
                  <div className="flex justify-between items-start gap-4 mb-6">
                    <div className="flex-1 space-y-1 text-[14px]">
                      <div className="flex border-b border-gray-100 py-1">
                        <span className="w-32 font-bold text-blue-900">Reg:</span>
                        <span className="uppercase font-black text-gray-800">{student.regNo}</span>
                      </div>
                      <div className="flex border-b border-gray-100 py-1">
                        <span className="w-32 font-bold text-blue-900">NAME:</span>
                        <span className="uppercase font-black text-gray-800">{student.name}</span>
                      </div>
                      <div className="flex border-b border-gray-100 py-1">
                        <span className="w-32 font-bold text-blue-900 uppercase tracking-tighter">Exam Roll No:</span>
                        <span className="font-mono font-black text-blue-900 text-lg">{student.examRollNo || '---'}</span>
                      </div>
                      <div className="flex border-b border-gray-100 py-1">
                        <span className="w-32 font-bold text-blue-900">CLASS:</span>
                        <span className="uppercase font-medium text-gray-700">{student.className}</span>
                      </div>
                      <div className="flex border-b border-gray-100 py-1">
                        <span className="w-32 font-bold text-blue-900">Father Name:</span>
                        <span className="uppercase font-medium text-gray-700">{student.fatherName}</span>
                      </div>
                    </div>
                    <div className="w-28 h-32 border-4 border-blue-900 p-0.5">
                        <img src={student.photoURL || "https://via.placeholder.com/150"} alt="Student" className="w-full h-full object-cover" />
                    </div>
                  </div>

                  {/* MARKS TABLE */}
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-blue-900 text-white">
                        <th className="p-2 w-12 text-center italic">S.N</th>
                        <th className="p-2 text-left italic">SUBJECTS NAME</th>
                        <th className="p-2 w-24 text-center italic">MAX</th>
                        <th className="p-2 w-24 text-center italic">OBT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="h-8">
                          <td className="p-1 text-center font-bold">{i + 1}</td>
                          <td className="p-1 uppercase font-black text-blue-900 px-2">{r.subject}</td>
                          <td className="p-1 text-center font-bold text-gray-400">{r.total}</td>
                          <td className="p-1 text-center font-black italic text-base">{r.marks}</td>
                        </tr>
                      ))}
                      {Array.from({ length: Math.max(0, TABLE_ROWS_COUNT - rows.length) }).map((_, i) => (
                        <tr key={`blank-${i}`} className="h-8">
                          <td>&nbsp;</td><td></td><td></td><td></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-50 font-black">
                      <tr>
                        <td colSpan="2" className="p-2 text-right uppercase text-xs">Total Obtained:</td>
                        <td className="p-2 text-center">{grandTotalMax}</td>
                        <td className="p-2 text-center text-xl text-blue-900 italic">{grandTotalObt}</td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* SUMMARY BOX */}
                  <div className="grid grid-cols-3 border-2 border-blue-900 rounded-lg overflow-hidden my-6 text-center">
                    <div className="p-2 border-r-2 border-blue-900">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter leading-none mb-1">Percentage</p>
                      <p className="text-lg font-black text-blue-900">{percent}%</p>
                    </div>
                    <div className="p-2 border-r-2 border-blue-900 bg-blue-50">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter leading-none mb-1">Grade</p>
                      <p className="text-lg font-black text-blue-900">{Number(percent) >= 33 ? 'A' : 'D'}</p>
                    </div>
                    <div className="p-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter leading-none mb-1">Status</p>
                      <p className={`text-lg font-black ${gradeStatus === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>{gradeStatus}</p>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="mt-auto flex justify-between px-6 pb-4 pt-10">
                    <div className="text-center">
                      <div className="w-32 border-b-2 border-black mb-1"></div>
                      <p className="text-[10px] font-black text-gray-500 uppercase italic">Class Teacher</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-900 font-serif italic text-sm mb-1 leading-none">Authorized Seal & Signature</p>
                      <div className="w-44 border-b-2 border-blue-900 mb-1"></div>
                      <p className="text-[10px] font-black text-blue-900 uppercase italic">Principal / HeadMaster</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* Naya interactive step ke liye: Would you like me to add a 'Class Rank' feature as well? */}
    </div>
  );
}