import React, { useEffect, useState, useMemo } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Loader2, Download, Search, TrendingUp, AlertCircle } from "lucide-react";

const FeesReport = () => {
  const [loading, setLoading] = useState(true);
  const [studentsData, setStudentsData] = useState([]);
  const [selectedClass, setSelectedClass] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const monthsList = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

  const fetchFeesReport = async () => {
    setLoading(true);
    try {
      const [studentSnap, feesManageSnap, feePlansSnap, feeMasterSnap] = await Promise.all([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "feesManage")),
        getDocs(collection(db, "fee_plans")),
        getDocs(collection(db, "fee_master"))
      ]);

      const feePlansMap = {};
      feePlansSnap.forEach((doc) => { feePlansMap[doc.id] = doc.data(); });

      const historyMap = {};
      feesManageSnap.forEach((doc) => { historyMap[doc.id] = doc.data().history || []; });

      const feeSchedules = feeMasterSnap.docs.map(d => d.data());
      const allStudents = [];

      studentSnap.forEach((doc) => {
        const student = doc.data();
        if (student.deletedAt) return;

        const studentId = doc.id;
        const currentSession = student.session;
        const className = student.className;
        const history = historyMap[studentId] || [];
        const classRates = feePlansMap[className] || {};

        let totalYearlyPayable = 0;

        monthsList.forEach((month) => {
          Object.keys(classRates).forEach((feeKey) => {
            const rate = Number(classRates[feeKey]) || 0;
            const schedule = feeSchedules.find(s => s.name.toLowerCase().trim() === feeKey.toLowerCase().trim());
            const isApplicable = !schedule || !schedule.months || schedule.months.length === 0 || schedule.months.includes(month);
            if (isApplicable) totalYearlyPayable += rate;
          });
          totalYearlyPayable += Number(student.transportFees || 0);
        });

        const totalPaid = history.filter(h => h.session === currentSession).reduce((sum, h) => sum + (Number(h.received) || 0), 0);
        const totalDiscount = history.filter(h => h.session === currentSession).reduce((sum, h) => sum + (Number(h.discount) || 0), 0);
        const finalPending = totalYearlyPayable - (totalPaid + totalDiscount);

        let monthStatus = {};
        monthsList.forEach((m) => {
          monthStatus[m] = student?.fees?.[currentSession]?.[m]?.status || "Pending";
        });

        allStudents.push({
          id: studentId,
          name: student.name,
          fatherName: student.fatherName,
          className: className,
          totalPaid,
          totalPending: finalPending > 0 ? finalPending : 0,
          ...monthStatus,
        });
      });

      setStudentsData(allStudents);
    } catch (error) {
      console.error("Fetch Error:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFeesReport();
  }, []);

  const filteredStudents = useMemo(() => {
    return studentsData.filter((s) => {
      const matchesClass = selectedClass === "All" || s.className === selectedClass;
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesClass && matchesSearch;
    });
  }, [studentsData, selectedClass, searchTerm]);

  const uniqueClasses = ["All", ...new Set(studentsData.map((s) => s.className))];
  const totalPaidSum = filteredStudents.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const totalPendingSum = filteredStudents.reduce((acc, curr) => acc + curr.totalPending, 0);

  // --- 🖨️ PRINT HANDLER (ADMIT CARD LOGIC) ---
  const executePrint = () => {
    const tableHTML = document.getElementById("reportTable").outerHTML;
    
    let printFrame = document.getElementById("printFrameLedger") || document.createElement("iframe");
    printFrame.id = "printFrameLedger";
    printFrame.style.display = "none";
    document.body.appendChild(printFrame);

    const style = `
      <style>
        @page { size: landscape; margin: 5mm; }
        body { font-family: sans-serif; padding: 10px; }
        h1 { text-align: center; text-transform: uppercase; font-size: 18px; margin-bottom: 5px; }
        .header-info { text-align: center; font-size: 10px; color: #666; margin-bottom: 15px; text-transform: uppercase; font-weight: bold; }
        .summary-box { display: flex; gap: 20px; margin-bottom: 15px; justify-content: center; }
        .sum-card { border: 1px solid #ddd; padding: 8px 15px; border-radius: 5px; text-align: center; }
        .sum-card p { margin: 0; font-size: 8px; color: #888; text-transform: uppercase; }
        .sum-card b { font-size: 14px; color: #333; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        th, td { border: 1px solid #ccc; padding: 6px 4px; text-align: left; }
        th { background: #f4f4f4; text-transform: uppercase; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin: 0 auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .bg-emerald-500 { background-color: #10b981 !important; }
        .bg-slate-200 { background-color: #e2e8f0 !important; }
        /* Hide unnecessary details for print */
        .no-print { display: none !important; }
        .sticky { position: static !important; background: white !important; }
      </style>
    `;

    const win = printFrame.contentWindow;
    win.document.open();
    win.document.write(`
      <html>
        <head>${style}</head>
        <body>
          <h1>School Fees Ledger Report</h1>
          <div class="header-info">Class: ${selectedClass} | Date: ${new Date().toLocaleDateString('en-IN')}</div>
          <div class="summary-box">
            <div class="sum-card"><p>Total Collected</p><b>₹${totalPaidSum.toLocaleString()}</b></div>
            <div class="sum-card"><p>Total Dues</p><b>₹${totalPendingSum.toLocaleString()}</b></div>
            <div class="sum-card"><p>Student Count</p><b>${filteredStudents.length}</b></div>
          </div>
          ${tableHTML}
        </body>
      </html>
    `);
    win.document.close();

    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
  };

  if (loading) return (
    <div className="h-screen flex flex-col justify-center items-center bg-white gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={50} />
      <p className="font-bold text-slate-400 animate-pulse uppercase tracking-widest text-xs">Generating Ledger...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-5 rounded-2xl border shadow-sm no-print">
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">School Fees Ledger</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest italic">Syncing with Master Rules</p>
          </div>
          <button 
            onClick={executePrint} 
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-lg"
          >
            <Download size={18}/> EXPORT REPORT
          </button>
        </div>

        {/* SUMMARY SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 no-print">
          <div className="bg-white p-5 rounded-2xl border-l-8 border-emerald-500 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Collection</p>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">₹{totalPaidSum.toLocaleString()}</h2>
            </div>
            <TrendingUp className="text-emerald-500" size={28}/>
          </div>
          <div className="bg-white p-5 rounded-2xl border-l-8 border-rose-500 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Total Dues</p>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">₹{totalPendingSum.toLocaleString()}</h2>
            </div>
            <AlertCircle className="text-rose-500" size={28}/>
          </div>
          <div className="bg-white p-5 rounded-2xl border-l-8 border-indigo-500 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Students</p>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{filteredStudents.length}</h2>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="no-print bg-white p-3 rounded-xl border mb-6 flex flex-col lg:flex-row gap-4 items-center shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input 
              type="text" 
              placeholder="Search Student..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 ring-indigo-500 font-bold text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {uniqueClasses.map(cls => (
              <button 
                key={cls} 
                onClick={() => setSelectedClass(cls)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${selectedClass === cls ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border text-slate-400 hover:bg-slate-50'}`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        {/* DATA TABLE (ID: reportTable) */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table id="reportTable" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500 sticky left-0 bg-slate-50 z-10">Student Details</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500 text-center">Class</th>
                  {monthsList.map(m => <th key={m} className="p-4 text-center text-[10px] font-black uppercase text-slate-400">{m}</th>)}
                  <th className="p-4 text-right text-[10px] font-black uppercase text-emerald-600 bg-emerald-50/50 font-mono">Paid</th>
                  <th className="p-4 text-right text-[10px] font-black uppercase text-rose-600 bg-rose-50/50 font-mono">Dues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-indigo-50/30 transition group">
                    <td className="p-4 sticky left-0 bg-white group-hover:bg-indigo-50/30 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                      <p className="font-bold text-slate-800 uppercase text-xs truncate max-w-[150px]">{s.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter truncate max-w-[150px]">F: {s.fatherName}</p>
                    </td>
                    <td className="p-4 text-center text-[10px] font-black text-slate-500 uppercase">{s.className}</td>
                    {monthsList.map(m => (
                      <td key={m} className="p-4 text-center">
                        <div className={`status-dot ${s[m] === "Paid" ? "bg-emerald-500" : "bg-slate-200"}`} />
                      </td>
                    ))}
                    <td className="p-4 text-right font-mono font-bold text-emerald-600 bg-emerald-50/10 text-xs">₹{s.totalPaid.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono font-bold text-rose-500 bg-rose-50/10 text-xs">₹{s.totalPending.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FeesReport;