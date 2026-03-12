import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase"; 
import { ChevronLeft, Receipt, Wallet, History, AlertCircle } from "lucide-react";

export default function Fees() {
  const location = useLocation();
  const navigate = useNavigate();
  const { student } = location.state || {}; // Dashboard se student data lega
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student?.id) {
        navigate("/dashboard");
        return;
    }
    const feeDocRef = doc(db, "feesManage", student.id);
    const unsubscribe = onSnapshot(feeDocRef, (snap) => {
      if (snap.exists()) setFeeData(snap.data());
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [student?.id, navigate]);

  if (loading) return <div className="flex h-screen items-center justify-center text-blue-600 font-bold">Loading Fees...</div>;

  const history = feeData?.history || [];
  const totalPaid = history.reduce((sum, item) => sum + (Number(item.received) || 0), 0);
  const pendingAmt = history.length > 0 ? history[history.length - 1].balanceAfterThis : 0;

  const monthOrder = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const paidMonths = history.flatMap(h => h.months || []);
  const dueMonths = monthOrder.filter(m => !paidMonths.includes(m));

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center shadow-sm sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full mr-2">
          <ChevronLeft size={24} className="text-blue-900" />
        </button>
        <h1 className="text-xl font-black text-blue-900 tracking-tight">Fee Ledger</h1>
      </div>

      <div className="max-w-md mx-auto p-4">
        {/* Summary Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 mb-6 border-l-8 border-l-blue-600">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">{student?.name}</h2>
            <Wallet className="text-blue-100" size={32} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Paid</p>
              <p className="text-xl font-black text-green-600">₹{totalPaid}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Due</p>
              <p className="text-xl font-black text-red-500">₹{pendingAmt}</p>
            </div>
          </div>
        </div>

        <h3 className="font-black text-blue-900 mb-4 flex items-center gap-2">
          <History size={18} /> Payment History
        </h3>

        {/* History List */}
        <div className="space-y-3">
          {history.map((txn, index) => (
            <div key={index} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-black text-slate-800 leading-tight">
                    {txn.months ? txn.months.join(", ") : "Payment"}
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                    {txn.paidAt ? new Date(txn.paidAt).toLocaleDateString('en-IN') : 'N/A'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-700 mr-2">₹{txn.received}</span>
                <button 
                  onClick={() => navigate("/receipt", { state: { 
                    name: feeData.studentName,
                    studentClass: feeData.className,
                    payMonth: txn.months ? txn.months.join(", ") : "",
                    received: txn.received,
                    paidAt: txn.paidAt,
                    paymentMode: txn.paymentMode,
                    allCharges: txn.allCharges || [], 
                    balanceAfterThis: txn.balanceAfterThis,
                    discount: txn.discount || 0
                  }})}
                  className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-100 active:scale-90 transition-transform"
                >
                  <Receipt size={18} />
                </button>
              </div>
            </div>
          ))}

          {/* Due Alert */}
          {dueMonths.length > 0 && (
            <div className="bg-red-50 p-4 rounded-3xl border border-red-100 flex items-start gap-3 mt-6">
              <AlertCircle className="text-red-500 mt-1" size={20} />
              <div>
                <p className="text-[10px] font-black text-red-800 uppercase tracking-widest">Pending Months</p>
                <p className="text-xs font-bold text-red-600 mt-1">{dueMonths.join(", ")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}