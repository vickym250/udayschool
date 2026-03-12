import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import QRCode from "react-qr-code";
import { Loader2 } from "lucide-react";

export default function FeesReceipt({
  studentId,
  name = "",
  studentClass = "",
  allCharges = [],
  studentWiseBreakdown = [],
  extraCharges = [],
  payMonth = "",
  paidAt,
  oldBalance = 0,
  currentTotal = 0,
  netPayable = 0,
  received = 0,
  discount = 0, // Naya Prop: Discount receive karne ke liye
  balance = 0,
  onClose,
}) {
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState({
    name: "Dr. A.P.J. Abdul Kalam Memorial Kid's Academy",
    address: "Barhni (Opp. Cold Storage), Post- Kathowtiya Alam, Dumariyaganj, Siddharth Nagar- 272189",
    phone: "9918488912",
    website: "https://drapjacademy.in",
    logoUrl: "https://drapjacademy.in/logo.png"
  });

  const [studentDetails, setStudentDetails] = useState(null);

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      try {
        const schSnap = await getDoc(doc(db, "settings", "schoolDetails"));
        if (schSnap.exists()) setSchool(prev => ({ ...prev, ...schSnap.data() }));

        if (studentId) {
          const stuSnap = await getDoc(doc(db, "students", studentId));
          if (stuSnap.exists()) setStudentDetails(stuSnap.data());
        }
      } catch (err) { 
        console.error("Receipt Fetch Error:", err); 
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };
    fetchInfo();
  }, [studentId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[2000] flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="font-black text-slate-700 uppercase tracking-widest text-sm">Generating Receipt...</p>
        </div>
      </div>
    );
  }

  const date = paidAt ? new Date(paidAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");

  const displayData = studentWiseBreakdown.length > 0 
    ? studentWiseBreakdown 
    : [{ studentName: name || studentDetails?.name, className: studentClass || studentDetails?.className, items: allCharges }];

  const allStudentNames = displayData.map(s => s.studentName).join(", ");
  const isFamily = displayData.length > 1;

  return (
    <div className="fixed inset-0 bg-gray-900/90 z-[1000] p-4 overflow-y-auto font-sans">
      <div className="no-print bg-white max-w-[210mm] mx-auto p-3 flex justify-between items-center mb-4 rounded shadow-lg border-b-4 border-blue-600">
        <button onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white px-6 py-1.5 rounded-full font-bold uppercase text-sm transition-colors">Close</button>
        <div className="text-center">
            <h2 className="font-black text-blue-800 tracking-tighter">FEES RECEIPT PREVIEW</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase">A4 Portrait Mode</p>
        </div>
        <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-1.5 rounded-full font-bold shadow-lg text-sm transition-transform active:scale-95">PRINT NOW</button>
      </div>

      <div id="print-area" className="w-[210mm] mx-auto bg-white p-[10mm] min-h-[297mm] shadow-2xl">
        <div className="border-[2px] border-black p-4 flex flex-col relative bg-white min-h-[145mm]">
          
          {/* HEADER SECTION */}
          <div className="flex items-center justify-between border-b-[1px] border-black pb-2 mb-2">
            <div className="w-20 h-20 border-[1px] border-slate-200 rounded-xl overflow-hidden flex items-center justify-center bg-slate-50">
               {school.logoUrl ? (
                 <img src={school.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
               ) : (
                 <div className="text-[10px] font-bold text-slate-300">LOGO</div>
               )}
            </div>
            
            <div className="flex-1 text-center px-4">
              <h1 className="text-[28px] font-black text-red-600 italic tracking-tighter uppercase leading-none mb-1">{school.name}</h1>
              <p className="text-blue-700 font-bold text-sm lowercase mb-1 underline decoration-blue-200">{school.website}</p>
              <p className="text-[10px] font-bold text-gray-800 leading-tight uppercase max-w-md mx-auto">{school.address}</p>
            </div>

            <div className="w-32 text-right font-bold text-blue-900">
              <p className="text-[12px] whitespace-nowrap">📞 {school.phone}</p>
              <div className="bg-black text-white px-2 py-0.5 mt-2 inline-block rounded text-[10px] uppercase tracking-widest font-black">
                {isFamily ? "Family Copy" : "Student Copy"}
              </div>
            </div>
          </div>

          {/* INFO SECTION */}
          <div className="grid grid-cols-2 gap-4 text-[13px] py-3 border-b-[1px] border-black mb-3 bg-slate-50/50 px-2 rounded">
            <div className="space-y-1">
              <p className="flex gap-2">
                <span className="font-bold min-w-[100px]">{isFamily ? "Family Members:" : "Student Name:"}</span> 
                <span className="uppercase font-black text-blue-900">{allStudentNames}</span>
              </p>
              <p className="flex gap-2">
                <span className="font-bold min-w-[100px]">Father's Name:</span> 
                <span className="uppercase font-bold text-slate-700">{studentDetails?.fatherName || "---"}</span>
              </p>
              <p className="flex gap-2">
                <span className="font-bold min-w-[100px]">Mobile:</span> 
                <span className="font-black text-slate-800 tracking-wider">{studentDetails?.phone || "---"}</span>
              </p>
            </div>
            <div className="text-right space-y-1">
              <p><b>Date:</b> <span className="font-bold">{date}</span></p>
              <p><b>Pay Month:</b> <span className="text-blue-700 font-black uppercase bg-blue-50 px-2 rounded">{payMonth}</span></p>
              <p><b>Academic Session:</b> 2025-26</p>
              <p><b>Class:</b> <span className="font-bold">{isFamily ? "Multiple" : `${studentClass || studentDetails?.className} `}</span></p>
            </div>
          </div>

          {/* TABLE SECTION */}
          <div className="flex-grow">
            <table className="w-full border-collapse border-[1.5px] border-black text-[12px]">
              <thead className="bg-slate-100 uppercase font-black">
                <tr className="border-b-[1.5px] border-black">
                  <th className="border-r-[1.5px] border-black w-12 py-2">S.No</th>
                  <th className="border-r-[1.5px] border-black text-left px-4">Particulars / Description</th>
                  <th className="text-right px-4 w-36">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {displayData.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    {isFamily && (
                      <tr className="bg-slate-50 border-b border-black font-black">
                        <td className="border-r border-black text-center">{gIdx + 1}</td>
                        <td colSpan="2" className="px-3 py-1.5 text-red-600 uppercase italic tracking-tighter">
                           {group.studentName} — {group.className}
                        </td>
                      </tr>
                    )}
                    {group.items?.map((item, iIdx) => (
                      <tr key={iIdx} className="h-8 border-b border-slate-200">
                        <td className="border-r-[1.5px] border-black text-center text-slate-400">{!isFamily ? iIdx + 1 : ""}</td>
                        <td className="border-r-[1.5px] border-black px-4 font-medium uppercase tracking-tight">
                           {item.name} {item.count > 1 ? `[${item.count} Months]` : ""}
                        </td>
                        <td className="text-right px-4 font-mono font-bold text-slate-900">{Number(item.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                {extraCharges?.length > 0 && (
                  <>
                    <tr className="bg-amber-50 border-y-[1.5px] border-black font-black italic">
                      <td className="border-r border-black"></td>
                      <td colSpan="2" className="px-3 py-1 uppercase text-[10px] text-amber-800 tracking-widest">Extra Charges / Fine / Misc</td>
                    </tr>
                    {extraCharges.map((ex, exIdx) => (
                      <tr key={exIdx} className="h-8 border-b border-slate-200 italic text-amber-700">
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black px-4">{ex.name}</td>
                        <td className="text-right px-4 font-mono font-bold">{Number(ex.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* SUMMARY & QR FOOTER */}
          <div className="mt-6 border-[1.5px] border-black flex bg-white">
            <div className="w-2/3 p-4 border-r-[1.5px] border-black flex flex-col justify-between">
               <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
                    <p className="text-[11px] font-black uppercase text-green-700 tracking-tighter">Payment Status: Verified & Paid</p>
                  </div>
                  <p className="text-[12px] leading-tight">
                    <b>Amount in Words:</b><br/>
                    <span className="italic font-black text-blue-900 underline uppercase decoration-blue-200 tracking-tight">Rupees {received} Only</span>
                  </p>
               </div>
               
               <div className="flex items-end justify-between mt-4">
                  <div className="p-1 border border-slate-100 rounded bg-white shadow-sm">
                    <QRCode value={`VERIFIED_RECEIPT:${allStudentNames}|AMT:${received}|DATE:${date}`} size={65} />
                  </div>
                  <div className="text-center">
                    <div className="w-40 border-t-2 border-black pt-1 font-black text-[10px] uppercase tracking-tighter">Authorized Signatory</div>
                    <p className="text-[8px] text-slate-400 mt-1 italic">Electronically Generated</p>
                  </div>
               </div>
            </div>

            <div className="w-1/3 text-[11px] font-bold">
               <div className="flex justify-between p-1.5 border-b border-slate-100"><span>Current Fee</span> <span>{Number(currentTotal).toFixed(2)}</span></div>
               <div className="flex justify-between p-1.5 border-b border-slate-100 text-red-600 italic"><span>Previous Dues</span> <span>{Number(oldBalance).toFixed(2)}</span></div>
               
               {/* DISCOUNT SECTION IN PRINT */}
               {discount > 0 && (
                 <div className="flex justify-between p-1.5 border-b border-slate-100 text-amber-600 font-black italic">
                   <span>Special Discount (-)</span> 
                   <span>{Number(discount).toFixed(2)}</span>
                 </div>
               )}

               <div className="flex justify-between p-2 border-y-[1.5px] border-black bg-slate-50 text-blue-800 text-[12px] font-black uppercase"><span>Paid Amount</span> <span>₹{Number(received).toFixed(2)}</span></div>
               <div className="flex justify-between p-3 bg-yellow-400 text-[16px] text-black font-black italic">
                 <span>BALANCE</span> 
                 <span>₹{Number(balance).toFixed(2)}</span>
               </div>
            </div>
          </div>

          <div className="text-center mt-3 opacity-20 text-[9px] font-black tracking-[8px] uppercase">vtech250 School ERP Solution</div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          #print-area { 
            width: 210mm; 
            height: 297mm; 
            padding: 10mm; 
            margin: 0; 
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}