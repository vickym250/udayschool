import React, { useState, useEffect } from "react";
import { db } from "../firebase"; 
import { doc, getDoc } from "firebase/firestore";
import { Loader2, Printer, X } from "lucide-react";
import QRCode from "react-qr-code";

// Helper function to convert number to words (Indian Style)
const numberToWords = (num) => {
  if (num === 0) return "Zero";
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const format = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + format(n % 100) : "");
    if (n < 100000) return format(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + format(n % 1000) : "");
    if (n < 10000000) return format(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + format(n % 100000) : "");
    return format(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 !== 0 ? " " + format(num % 10000000) : "");
  };
  return format(Math.floor(num));
};

export default function SalaryReceipt({
  teacherName,
  subject,
  phone,
  month,
  totalAmount = 0,
  paidAmount = 0,
  absents = 0,
  totalDays = 30,
  cutAmount = 0,
  bonus = 0,
  prevDue = 0,
  balance = 0,
  paidAt,
  receiptNo,
  onClose, // Passed from TeacherBilling
}) {
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState({
    name: "Dr. A.P.J. Abdul Kalam Memorial Kid's Academy",
    address: "Barhni, Post- Kathowtiya Alam, Dumariyaganj, Siddharth Nagar",
    phone: "9918488912",
    website: "https://drapjacademy.in",
    logoUrl: "https://drapjacademy.in/logo.png"
  });

  useEffect(() => {
    const fetchSchoolInfo = async () => {
      try {
        const schSnap = await getDoc(doc(db, "settings", "schoolDetails"));
        if (schSnap.exists()) setSchool(prev => ({ ...prev, ...schSnap.data() }));
      } catch (err) {
        console.error("Receipt Fetch Error:", err);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };
    fetchSchoolInfo();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[2000] flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="font-black text-slate-700 uppercase tracking-widest text-xs text-center">
            GENERATING OFFICIAL<br/>SALARY SLIP...
          </p>
        </div>
      </div>
    );
  }

  const date = paidAt ? new Date(paidAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");
  const grossTotal = Number(totalAmount) + Number(bonus) + Number(prevDue);

  return (
    <div className="fixed inset-0 bg-gray-900/90 z-[1000] p-4 overflow-y-auto font-sans">
      
      {/* TOOLBAR: Fixed and non-printable */}
      <div className="no-print sticky top-0 bg-white max-w-[210mm] mx-auto p-4 flex justify-between items-center mb-6 rounded-2xl shadow-2xl border-b-4 border-indigo-600">
        <button 
          onClick={onClose} // FIXED: Refresh ke bajaye component close karega
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-black flex items-center gap-2 transition-all active:scale-95 border-b-2 border-slate-300"
        >
          <X size={18}/> CLOSE
        </button>
        <div className="text-center hidden md:block">
            <h2 className="font-black text-indigo-900 tracking-tighter italic">SALARY SLIP PREVIEW</h2>
            <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-[0.2em]">Official Document</p>
        </div>
        <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-black shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95 border-b-2 border-indigo-800">
          <Printer size={18}/> PRINT NOW
        </button>
      </div>

      {/* PRINT AREA */}
      <div id="print-area" className="w-[210mm] mx-auto bg-white p-[10mm] min-h-[297mm] shadow-2xl printable-receipt">
        <div className="border-[2px] border-black p-4 flex flex-col relative bg-white min-h-[140mm]">
          
          {/* HEADER SECTION */}
          <div className="flex items-center justify-between border-b-[2px] border-black pb-4 mb-4">
            <div className="w-24 h-24 border-2 border-slate-100 rounded-2xl overflow-hidden bg-white flex items-center justify-center p-1">
                {school.logoUrl && <img src={school.logoUrl} alt="Logo" className="w-full h-full object-contain" />}
            </div>
            
            <div className="flex-1 text-center px-4">
              <h1 className="text-[32px] font-black text-slate-900 tracking-tighter uppercase leading-none mb-1">{school.name}</h1>
              <p className="text-indigo-700 font-black text-xs mb-1 uppercase tracking-widest">{school.website}</p>
              <p className="text-[10px] font-bold text-gray-500 leading-tight uppercase max-w-md mx-auto">{school.address}</p>
            </div>

            <div className="w-40 text-right font-bold text-slate-900">
              <p className="text-[13px] font-black underline decoration-indigo-200 decoration-2">Ph: {school.phone}</p>
              <div className="bg-slate-900 text-white px-3 py-1.5 mt-2 inline-block rounded font-black text-[10px] uppercase tracking-[0.2em]">
                SALARY VOUCHER
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">ID: {receiptNo || `VCH-${Date.now().toString().slice(-6)}`}</p>
            </div>
          </div>

          {/* INFO SECTION */}
          <div className="grid grid-cols-2 gap-8 text-[13px] py-4 border-b-2 border-black mb-6 bg-slate-50/50 px-4 rounded-xl">
            <div className="space-y-3">
              <p className="flex justify-between border-b border-slate-200 pb-1">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-widest">Employee Name:</span> 
                <span className="font-black text-slate-900 uppercase italic">{teacherName}</span>
              </p>
              <p className="flex justify-between border-b border-slate-200 pb-1">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-widest">Department:</span> 
                <span className="font-black text-slate-800 uppercase">{subject || 'Academic Staff'}</span>
              </p>
              <p className="flex justify-between border-b border-slate-200 pb-1">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-widest">Contact No:</span> 
                <span className="font-black text-slate-700">{phone || "---"}</span>
              </p>
            </div>
            <div className="space-y-2 text-right">
              <p className="text-sm font-black text-slate-900">
                MONTH: <span className="bg-indigo-600 text-white px-3 py-1 rounded ml-1 uppercase">{month}</span>
              </p>
              <p className="font-bold text-slate-600 uppercase text-[10px]">Payment Date: <span className="text-slate-900 font-black">{date}</span></p>
              <p className="font-bold text-slate-600 uppercase text-[10px]">Duty Status: <span className="text-green-600 font-black">{totalDays - absents} Days Present</span></p>
            </div>
          </div>

          {/* TABLE */}
          <div className="flex-grow">
            <table className="w-full border-collapse border-[2px] border-black text-[13px]">
              <thead className="bg-slate-900 text-white uppercase font-black text-[11px] tracking-widest">
                <tr>
                  <th className="border-r border-white w-12 py-3 text-center">#</th>
                  <th className="border-r border-white text-left px-5">Salary Particulars</th>
                  <th className="text-right px-5 w-48">Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="h-12 border-b-2 border-black">
                  <td className="border-r-2 border-black text-center font-black text-slate-300">01</td>
                  <td className="border-r-2 border-black px-5 font-black uppercase tracking-tight">Standard Basic Salary</td>
                  <td className="text-right px-5 font-mono font-black text-slate-800">₹{Number(totalAmount).toLocaleString('en-IN')}.00</td>
                </tr>
                {bonus > 0 && (
                  <tr className="h-12 border-b-2 border-black text-emerald-700 bg-emerald-50/30">
                    <td className="border-r-2 border-black text-center font-black text-emerald-200">02</td>
                    <td className="border-r-2 border-black px-5 font-black uppercase italic">Performance Bonus (+)</td>
                    <td className="text-right px-5 font-mono font-black">+{Number(bonus).toLocaleString('en-IN')}.00</td>
                  </tr>
                )}
                {prevDue > 0 && (
                  <tr className="h-12 border-b-2 border-black text-indigo-700 bg-indigo-50/30">
                    <td className="border-r-2 border-black text-center font-black text-indigo-200">03</td>
                    <td className="border-r-2 border-black px-5 font-black uppercase italic">Arrears/Pending Dues (+)</td>
                    <td className="text-right px-5 font-mono font-black">+{Number(prevDue).toLocaleString('en-IN')}.00</td>
                  </tr>
                )}
                {cutAmount > 0 && (
                  <tr className="h-12 border-b-2 border-black text-rose-600 bg-rose-50/40">
                    <td className="border-r-2 border-black text-center font-black text-rose-200">04</td>
                    <td className="border-r-2 border-black px-5 font-black uppercase italic text-[11px]">
                        Leave Deductions (-) <span className="ml-2 font-mono text-[10px] opacity-60">[{absents} ABSENTS]</span>
                    </td>
                    <td className="text-right px-5 font-mono font-black">-{Number(cutAmount).toLocaleString('en-IN')}.00</td>
                  </tr>
                )}
                {/* Filler Rows to maintain height */}
                {[...Array(4)].map((_, i) => (
                   <tr key={i} className="h-12 border-b border-slate-100"><td className="border-r-2 border-black"></td><td className="border-r-2 border-black"></td><td></td></tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FOOTER SUMMARY */}
          <div className="mt-6 border-[2px] border-black flex bg-white">
            <div className="w-2/3 p-5 border-r-[2px] border-black flex flex-col justify-between">
                <div>
                  <p className="text-[14px] leading-tight mb-6">
                    <b className="text-slate-400 uppercase text-[9px] tracking-widest block mb-1">Total in Words:</b>
                    <span className="italic font-black text-slate-900 uppercase tracking-tighter decoration-indigo-200 decoration-4 underline">
                      {numberToWords(paidAmount)} Rupees Only
                    </span>
                  </p>
                </div>
                
                <div className="flex items-end justify-between">
                  <div className="p-2 border-2 border-slate-900 rounded-2xl bg-white shadow-xl">
                    <QRCode 
                        value={`STAFF_PAY_REF:${receiptNo}|NAME:${teacherName}|AMT:${paidAmount}|DATE:${date}`} 
                        size={80} 
                        level="H"
                    />
                  </div>
                  <div className="text-center">
                    <div className="w-48 border-t-2 border-black pt-2 font-black text-[11px] uppercase tracking-widest">Director / Accountant</div>
                    <p className="text-[8px] text-slate-400 mt-1 italic tracking-[0.3em]">SCHOOL MANAGEMENT SYSTEM</p>
                  </div>
                </div>
            </div>

            <div className="w-1/3 text-[13px] font-black">
               <div className="flex justify-between p-3 border-b border-slate-100">
                 <span className="text-slate-400 uppercase text-[9px]">Gross Payable</span> 
                 <span className="text-slate-800 font-mono">₹{grossTotal.toLocaleString('en-IN')}</span>
               </div>
               <div className="flex justify-between p-3 border-b-2 border-black bg-slate-900 text-white font-black uppercase italic">
                 <span className="text-[9px]">Actually Paid</span> 
                 <span className="text-md font-mono">₹{Number(paidAmount).toLocaleString('en-IN')}</span>
               </div>
               <div className="flex justify-between p-5 bg-yellow-400 text-[22px] text-black font-black italic shadow-inner border-t border-black">
                 <span className="tracking-tighter">DUES:</span> 
                 <span className="font-mono">₹{Number(balance).toLocaleString('en-IN')}</span>
               </div>
            </div>
          </div>

          <div className="text-center mt-6 opacity-30 text-[8px] font-black tracking-[15px] uppercase italic text-slate-900">
            Official System Generated Document - vtech250 ERP
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; background: white !important; }
          .no-print { display: none !important; }
          #print-area { 
            width: 210mm; 
            height: 297mm; 
            padding: 10mm; 
            margin: 0; 
            box-shadow: none;
            border: none;
          }
        }
      `}</style>
    </div>
  );
}