import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { ChevronLeft, Download, Award, FileText } from "lucide-react";

export default function Marks() {
  const location = useLocation();
  const navigate = useNavigate();
  const student = location.state?.student || JSON.parse(localStorage.getItem("student"));

  const [selectedExam, setSelectedExam] = useState("Quarterly");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadResult = async (examType) => {
    setLoading(true);
    setSelectedExam(examType);
    try {
      const q = query(
        collection(db, "examResults"),
        where("roll", "==", student.rollNumber.toString()),
        where("className", "==", student.className),
        where("exam", "==", examType)
      );
      const snap = await getDocs(q);
      if (!snap.empty) setData(snap.docs[0].data());
      else setData({ notFound: true });
    } catch (e) {
      console.log("Error:", e);
      setData({ notFound: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (student) loadResult("Quarterly");
  }, []);

  const subjects = data?.rows || [];
  const hasResult = data && !data.notFound && subjects.length > 0;
  
  const grandTotalMax = subjects.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const grandTotalObt = subjects.reduce((s, r) => s + (Number(r.marks) || 0), 0);
  const percent = grandTotalMax > 0 ? ((grandTotalObt / grandTotalMax) * 100).toFixed(2) : "0.00";

  const downloadResultPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(30, 64, 175);
    doc.text("SUNSHINE ENGLISH MEDIUM SCHOOL", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`${selectedExam.toUpperCase()} RESULT CARD`, 105, 28, { align: "center" });
    
    doc.autoTable({
      startY: 40,
      head: [['Subject', 'Max Marks', 'Obtained']],
      body: subjects.map(s => [s.subject, s.total, s.marks]),
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175] }
    });
    
    doc.text(`Percentage: ${percent}%`, 20, doc.lastAutoTable.finalY + 15);
    doc.save(`${student.name}_Result.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans">
      <div className="bg-white px-4 py-4 flex items-center shadow-sm sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full mr-2">
          <ChevronLeft size={24} className="text-blue-900" />
        </button>
        <h1 className="text-xl font-black text-blue-900">Report Card</h1>
      </div>

      <div className="max-w-md mx-auto p-4">
        {/* Exam Type Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar py-2">
          {["Quarterly", "Half-Yearly", "Annual"].map((ex) => (
            <button
              key={ex}
              onClick={() => loadResult(ex)}
              className={`px-6 py-3 rounded-2xl font-black text-xs whitespace-nowrap transition-all ${
                selectedExam === ex ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white text-slate-400 border border-slate-100"
              }`}
            >
              {ex}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-blue-600 font-bold italic">Fetching Result...</div>
        ) : !hasResult ? (
          <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-200">
            <FileText size={40} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 font-bold">Result Not Declared Yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-blue-600 p-6 text-center text-white">
              <Award size={48} className="mx-auto mb-2 opacity-80" />
              <h2 className="text-2xl font-black italic">{percent}%</h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Aggregate Score</p>
            </div>

            <div className="p-6">
              <div className="space-y-4 mb-6">
                {subjects.map((s, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <span className="font-bold text-slate-600 text-sm">{s.subject}</span>
                    <span className="font-black text-blue-900">{s.marks} / {s.total}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={downloadResultPDF}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Download size={20} /> Download Report Card
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}