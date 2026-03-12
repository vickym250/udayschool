import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { ChevronLeft, Download, Printer } from "lucide-react";

export default function FeesReceipt() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Fees.jsx se data receive karna
  const { 
    name, studentClass, payMonth, received, paidAt,
    allCharges = [], paymentMode, balanceAfterThis, discount = 0 
  } = location.state || {};

  const totalGross = allCharges.reduce((sum, item) => sum + Number(item.total), 0);
  const netPayable = totalGross - Number(discount);
  const receiptDate = paidAt ? new Date(paidAt).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");

  // PDF Generate karne ka function
  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // School Header
    doc.setFontSize(18);
    doc.setTextColor(185, 28, 28);
    doc.text("SUNSHINE ENGLISH MEDIUM SCHOOL", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("MAHANUA MANNIJOT SIDDHARTHNAGAR UP", 105, 26, { align: "center" });
    doc.line(20, 32, 190, 32);

    // Student Details
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Student Name: ${name}`, 20, 42);
    doc.text(`Class: ${studentClass}`, 20, 49);
    doc.text(`Date: ${receiptDate}`, 140, 42);
    doc.text(`Pay Month: ${payMonth}`, 140, 49);

    // Charges Table
    const tableData = allCharges.map((item, i) => [
        i + 1, 
        `${item.name} ${item.count > 1 ? `(x${item.count})` : ''}`, 
        `Rs. ${Number(item.total).toFixed(2)}`
    ]);

    doc.autoTable({
      startY: 55,
      head: [['S.No', 'Particulars / Description', 'Amount (INR)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [185, 28, 28] }
    });

    // Summary Calculations
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Total Fees: Rs. ${totalGross.toFixed(2)}`, 140, finalY);
    if(discount > 0) {
        doc.setTextColor(0, 128, 0);
        doc.text(`Discount: -Rs. ${Number(discount).toFixed(2)}`, 140, finalY + 7);
        doc.setTextColor(0);
        doc.text(`Net Payable: Rs. ${netPayable.toFixed(2)}`, 140, finalY + 14);
    }
    
    doc.setFont(undefined, 'bold');
    doc.text(`PAID AMOUNT: Rs. ${Number(received).toFixed(2)}`, 140, finalY + 21);
    doc.setTextColor(220, 38, 38);
    doc.text(`BALANCE: Rs. ${Number(balanceAfterThis).toFixed(2)}`, 140, finalY + 28);

    doc.save(`Receipt_${name}_${payMonth}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans">
      <div className="bg-white px-4 py-4 flex items-center shadow-sm sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full mr-2">
          <ChevronLeft size={24} className="text-blue-900" />
        </button>
        <h1 className="text-xl font-black text-blue-900 tracking-tight">Fee Receipt</h1>
      </div>

      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-[32px] shadow-xl overflow-hidden border-t-[10px] border-red-600">
          <div className="p-6 text-center border-b border-slate-50">
            <h2 className="text-lg font-black text-red-700">SUNSHINE ENGLISH MEDIUM SCHOOL</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Siddharthnagar, UP</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Student Name</p>
                <p className="font-black text-slate-800">{name}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Date</p>
                <p className="font-black text-slate-800">{receiptDate}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Class</p>
                <p className="font-black text-slate-800">{studentClass}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Month</p>
                <p className="font-black text-slate-800">{payMonth}</p>
              </div>
            </div>

            <div className="border-y border-slate-50 py-4 space-y-2">
              <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-2">Particulars</p>
              {allCharges.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">{item.name} {item.count > 1 ? `x${item.count}` : ''}</span>
                  <span className="font-bold text-slate-800">₹{item.total}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-bold">Total Gross</span>
                <span className="font-bold">₹{totalGross}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="font-bold">Discount</span>
                  <span className="font-bold">- ₹{discount}</span>
                </div>
              )}
              <div className="bg-amber-50 p-4 rounded-2xl flex justify-between items-center border-l-4 border-amber-400">
                <span className="text-amber-800 font-black uppercase text-xs">Amount Paid</span>
                <span className="text-xl font-black text-amber-900">₹{received}</span>
              </div>
              <div className="flex justify-between text-sm text-red-500 pt-2 font-black uppercase">
                <span>Balance Due</span>
                <span>₹{balanceAfterThis}</span>
              </div>
            </div>

            <button 
              onClick={downloadPDF}
              className="w-full mt-6 bg-red-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-red-100 active:scale-95 transition-all"
            >
              <Download size={20} /> Download Receipt (PDF)
            </button>
          </div>
        </div>
        
        <p className="text-center mt-8 text-[10px] text-slate-300 font-bold uppercase tracking-[0.4em]">Verified Digital Receipt</p>
      </div>
    </div>
  );
}