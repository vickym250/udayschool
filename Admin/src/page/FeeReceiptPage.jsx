import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, setDoc, collection, getDocs, query, where, arrayUnion } from 'firebase/firestore';
import { User, Loader2, Printer, PlusCircle, Trash2, Users, CheckCircle2, Calendar, UserMinus, UserCheck } from 'lucide-react';
import FeesReceipt from '../component/Fess';
import toast from "react-hot-toast";

const StudentBilling = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]); 
  const [studentBaseData, setStudentBaseData] = useState(null); 
  const [feeRatesMap, setFeeRatesMap] = useState({}); 
  const [feeSchedules, setFeeSchedules] = useState([]); 
  const [totalPaidInPast, setTotalPaidInPast] = useState(0); 
  
  const [activeSession, setActiveSession] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const [selectedMonths, setSelectedMonths] = useState({}); 
  const [uncheckedItems, setUncheckedItems] = useState({}); 
  const [excludedStudents, setExcludedStudents] = useState({}); 

  const [extraCharges, setExtraCharges] = useState([]);
  const [amountReceived, setAmountReceived] = useState("");
  const [discount, setDiscount] = useState(""); 
  const [paymentMode, setPaymentMode] = useState("Cash");

  const monthsList = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

  useEffect(() => {
    if (id) {
      const savedMonths = localStorage.getItem(`selectedMonths_${id}`);
      const savedUnchecked = localStorage.getItem(`uncheckedItems_${id}`);
      const savedExcluded = localStorage.getItem(`excludedStudents_${id}`);

      if (savedMonths) setSelectedMonths(JSON.parse(savedMonths));
      if (savedUnchecked) setUncheckedItems(JSON.parse(savedUnchecked));
      if (savedExcluded) setExcludedStudents(JSON.parse(savedExcluded));
    }
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const studentDoc = await getDoc(doc(db, "students", id));
      if (!studentDoc.exists()) {
        toast.error("Student not found!");
        return navigate("/students");
      }
      
      const sData = studentDoc.data();
      if (sData.deletedAt && sData.deletedAt !== null && sData.deletedAt !== "") {
          toast.error("Ye student archive ho chuka hai!");
          return navigate("/students");
      }

      setStudentBaseData(sData); 
      const studentSession = sData.session; 
      setActiveSession(studentSession);

      const q = query(
        collection(db, "students"), 
        where("parentId", "==", sData.parentId),
        where("session", "==", studentSession) 
      );
      
      const familySnap = await getDocs(q);
      const members = familySnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(student => !student.deletedAt || student.deletedAt === null || student.deletedAt === "");

      setFamilyMembers(members);

      let pastPaymentsSum = 0;
      for (const member of members) {
        const feeManageDoc = await getDoc(doc(db, "feesManage", member.id));
        if (feeManageDoc.exists()) {
          const history = feeManageDoc.data().history || [];
          history.forEach(entry => {
            if(entry.session === studentSession) {
                pastPaymentsSum += Number(entry.received || 0);
            }
          });
        }
      }
      setTotalPaidInPast(pastPaymentsSum);

      const uniqueClasses = [...new Set(members.map(m => m.className))];
      const ratesCollector = {};
      for (const className of uniqueClasses) {
        const planDoc = await getDoc(doc(db, "fee_plans", className));
        if (planDoc.exists()) ratesCollector[className] = planDoc.data();
      }
      setFeeRatesMap(ratesCollector);

      const masterSnap = await getDocs(collection(db, "fee_master"));
      setFeeSchedules(masterSnap.docs.map(d => d.data()));
    } catch (e) { 
        console.error("Fetch Error:", e); 
        toast.error("Data load karne mein error aaya");
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setReceiptData(null);
    setSelectedMonths({});
    setUncheckedItems({});
    setExtraCharges([]);
    setAmountReceived("");
    setDiscount("");
    fetchData();
  };

  const handleViewOldReceipt = async (studentId, monthName) => {
    setLoading(true);
    try {
      const feeDoc = await getDoc(doc(db, "feesManage", studentId));
      if (feeDoc.exists()) {
        const data = feeDoc.data();
        const foundEntry = data.history?.find(h => 
            h.months.includes(monthName) && h.session === activeSession
        );
        
        if (foundEntry) {
          setReceiptData({
            ...foundEntry,
            studentId: studentId,
            payMonth: foundEntry.months.join(", "),
            balance: foundEntry.balanceAfterThis !== undefined ? foundEntry.balanceAfterThis : 0,
            studentWiseBreakdown: [{
                studentName: data.studentName,
                className: data.className,
                items: foundEntry.allCharges
            }]
          });
          setShowReceipt(true);
        } else {
          toast.error(`Is mahine ki payment record nahi mili!`);
        }
      }
    } catch (e) { console.error("Error:", e); }
    setLoading(false);
  };

  const addExtraCharge = (name, amount) => {
    if (!name || !amount) return toast.error("Details bharein!");
    setExtraCharges([...extraCharges, { id: Date.now(), name, total: Number(amount), count: 1 }]);
  };

  const toggleMonth = (studentId, month) => {
    setSelectedMonths(prev => {
      const current = prev[studentId] || [];
      const updated = { ...prev, [studentId]: current.includes(month) ? current.filter(m => m !== month) : [...current, month] };
      localStorage.setItem(`selectedMonths_${id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const toggleTableItem = (studentId, feeKey) => {
    setUncheckedItems(prev => {
      const current = prev[studentId] || [];
      const updated = { ...prev, [studentId]: current.includes(feeKey) ? current.filter(i => i !== feeKey) : [...current, feeKey] };
      localStorage.setItem(`uncheckedItems_${id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const toggleStudentExclusion = (studentId) => {
    setExcludedStudents(prev => {
      const updated = { ...prev, [studentId]: !prev[studentId] };
      localStorage.setItem(`excludedStudents_${id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const billDetails = useMemo(() => {
    let totalOldBalance = 0;
    let studentWiseBreakdown = [];

    familyMembers.forEach(student => {
      totalOldBalance += Number(student.currentBalance || 0);

      if (excludedStudents[student.id]) return;

      const studentSelected = selectedMonths[student.id] || [];
      const studentUnchecked = uncheckedItems[student.id] || [];
      const rates = feeRatesMap[student.className] || {};
      
      let studentItems = [];
      Object.keys(rates).forEach(feeKey => {
        const rate = Number(rates[feeKey]);
        const schedule = feeSchedules.find(s => s.name.toLowerCase().trim() === feeKey.toLowerCase().trim());
        const count = studentSelected.filter(m => !schedule || !schedule.months || schedule.months.length === 0 || schedule.months.includes(m)).length;
        
        if (rate > 0 && count > 0) {
          studentItems.push({ 
            name: feeKey, 
            rate, 
            count, 
            total: rate * count, 
            feeKey,
            isChecked: !studentUnchecked.includes(feeKey)
          });
        }
      });

      if (student.busFees && studentSelected.length > 0) {
        studentItems.push({ 
            name: "Bus Fees", 
            rate: Number(student.busFees), 
            count: studentSelected.length, 
            total: Number(student.busFees) * studentSelected.length, 
            feeKey: "Bus Fees",
            isChecked: !studentUnchecked.includes("Bus Fees")
        });
      }

      if (studentItems.length > 0 || Number(student.currentBalance || 0) > 0) {
        studentWiseBreakdown.push({
          studentId: student.id,
          studentName: student.name,
          className: student.className,
          items: studentItems
        });
      }
    });

    const currentBillTotal = studentWiseBreakdown.reduce((total, group) => {
        const groupTotal = group.items.filter(i => i.isChecked).reduce((sum, item) => sum + item.total, 0);
        return total + groupTotal;
    }, 0) + extraCharges.reduce((acc, ex) => acc + ex.total, 0);

    return { totalOldBalance, currentBillTotal, studentWiseBreakdown };
  }, [familyMembers, selectedMonths, feeRatesMap, feeSchedules, uncheckedItems, extraCharges, excludedStudents]);

  const netPayable = (billDetails.currentBillTotal + billDetails.totalOldBalance) - Number(discount || 0);
  const finalNewBalance = netPayable - Number(amountReceived || 0);

  const isMonthSelected = billDetails.studentWiseBreakdown.some(s => (selectedMonths[s.studentId]?.length > 0));
  const canPay = (isMonthSelected || billDetails.totalOldBalance > 0) && Number(amountReceived) > 0;

  const handleSaveAndPrint = async () => {
    if (!amountReceived || Number(amountReceived) < 0) {
        return toast.error("Received Amount bharein!");
    }

    setIsProcessing(true);
    try {
      const currentTime = new Date().toISOString();
      const receiptId = `REC-${Date.now()}`;
      
      let remainingCash = Number(amountReceived || 0);
      let remainingDiscount = Number(discount || 0);

      const sortedStudents = [...familyMembers].sort((a, b) => 
        a.id === id ? -1 : b.id === id ? 1 : 0
      );

      for (const studentObj of sortedStudents) {
        if (excludedStudents[studentObj.id]) continue;

        const studentMonths = selectedMonths[studentObj.id] || [];
        const breakdown = billDetails.studentWiseBreakdown.find(b => b.studentId === studentObj.id);
        const activeItems = breakdown ? breakdown.items.filter(it => it.isChecked) : [];
        
        const oldBal = Number(studentObj.currentBalance || 0);
        const newBill = activeItems.reduce((acc, it) => acc + it.total, 0);
        const extra = studentObj.id === id ? extraCharges.reduce((acc, ex) => acc + ex.total, 0) : 0;
        
        const totalDueThisStudent = oldBal + newBill + extra;

        let studentDiscApplied = 0;
        if (remainingDiscount > 0) {
            if (remainingDiscount >= totalDueThisStudent) {
                studentDiscApplied = totalDueThisStudent;
                remainingDiscount -= totalDueThisStudent;
            } else {
                studentDiscApplied = remainingDiscount;
                remainingDiscount = 0;
            }
        }

        const afterDiscountDue = totalDueThisStudent - studentDiscApplied;

        let studentCashApplied = 0;
        if (remainingCash > 0) {
            if (remainingCash >= afterDiscountDue) {
                studentCashApplied = afterDiscountDue;
                remainingCash -= afterDiscountDue;
            } else {
                studentCashApplied = remainingCash;
                remainingCash = 0;
            }
        }

        const studentNewFinalBalance = afterDiscountDue - studentCashApplied;
        const displayCharges = activeItems.length > 0 ? activeItems : [{ name: "Previous Dues Payment", total: studentCashApplied, count: 1 }];

        const historyEntry = {
          receiptId,
          months: studentMonths.length > 0 ? studentMonths.sort((a, b) => monthsList.indexOf(a) - monthsList.indexOf(b)) : ["Dues Payment"],
          allCharges: displayCharges,
          paidAt: currentTime,
          paymentMode,
          received: studentCashApplied,
          discount: studentDiscApplied,
          currentTotal: newBill,
          oldBalance: oldBal,
          extraCharges: studentObj.id === id ? extraCharges : [],
          balanceAfterThis: studentNewFinalBalance,
          session: activeSession 
        };

        const feeRef = doc(db, "feesManage", studentObj.id);
        const feeDocCheck = await getDoc(feeRef);
        if (!feeDocCheck.exists()) {
            await setDoc(feeRef, {
                studentId: studentObj.id,
                studentName: studentObj.name,
                className: studentObj.className,
                history: [historyEntry]
            });
        } else {
            await updateDoc(feeRef, { history: arrayUnion(historyEntry) });
        }

        const updatedFees = { ...(studentObj.fees || {}) };
        if (!updatedFees[activeSession]) updatedFees[activeSession] = {};
        studentMonths.forEach(m => {
          updatedFees[activeSession][m] = { status: "Paid", paidAt: currentTime, receiptId };
        });

        await updateDoc(doc(db, "students", studentObj.id), {
          fees: updatedFees,
          currentBalance: studentNewFinalBalance 
        });
      }

      setReceiptData({
        receiptId, studentId: id,
        studentWiseBreakdown: billDetails.studentWiseBreakdown.map(g => {
            const active = g.items.filter(i => i.isChecked);
            return {
                ...g,
                items: active.length > 0 ? active : [{ name: "Dues Payment", total: amountReceived, count: 1 }]
            }
        }),
        extraCharges, discount: Number(discount || 0), received: Number(amountReceived || 0),
        oldBalance: billDetails.totalOldBalance, currentTotal: billDetails.currentBillTotal,
        netPayable, paymentMode, balance: finalNewBalance, paidAt: currentTime,
        payMonth: isMonthSelected ? [...new Set(Object.values(selectedMonths).flat())].join(", ") : "Dues Clear",
        session: activeSession
      });

      localStorage.removeItem(`selectedMonths_${id}`);
      localStorage.removeItem(`uncheckedItems_${id}`);
      localStorage.removeItem(`excludedStudents_${id}`);

      setShowReceipt(true);
      toast.success("Billing Success!");
    } catch (e) { 
        console.error(e);
        toast.error("Process failed!"); 
    }
    setIsProcessing(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900">
      {showReceipt && receiptData && <FeesReceipt {...receiptData} onClose={handleCloseReceipt} />}

      <div className={`max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 ${showReceipt ? 'hidden' : ''}`}>
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white p-5 rounded-2xl border-l-8 border-indigo-600 shadow-sm flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase flex items-center gap-1 shadow-sm">
                    <Calendar size={12}/> Session: {activeSession}
                  </span>
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase flex items-center gap-1 shadow-sm">
                    <CheckCircle2 size={12}/> Billing Active
                  </span>
                </div>
                <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">{studentBaseData?.name}</h1>
                <p className="text-sm font-bold text-slate-500">
                    Class: <span className="text-indigo-600 font-black">{studentBaseData?.className}</span> | 
                    Father: <span className="text-slate-700 font-bold">{studentBaseData?.fatherName}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Roll No</p>
                <p className="text-2xl font-black text-slate-800">{studentBaseData?.rollNo || "--"}</p>
              </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-2xl flex justify-between items-center shadow-lg border-b-4 border-indigo-500">
              <div className="flex items-center gap-4">
                  <div className="bg-indigo-500 p-3 rounded-xl"><Users size={32} /></div>
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight">Family Billing Center</h2>
                    <p className="text-xs font-bold tracking-widest opacity-70">Phone: {studentBaseData?.phone || "N/A"}</p>
                  </div>
              </div>
              <div className="flex gap-6">
                <div className="text-right border-r border-slate-700 pr-6">
                    <p className="text-[10px] uppercase opacity-50 font-black tracking-widest">Current Session Paid</p>
                    <p className="text-xl font-black text-indigo-400 flex items-center justify-end gap-1">₹{totalPaidInPast.toFixed(2)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase opacity-50 font-black tracking-widest">Total Family Dues</p>
                    <p className="text-2xl font-black text-amber-400">₹{billDetails.totalOldBalance.toFixed(2)}</p>
                </div>
              </div>
          </div>

          {familyMembers.map(student => {
            const isMainStudent = student.id === id;
            const isExcluded = excludedStudents[student.id];
            const studentBreakdown = billDetails.studentWiseBreakdown.find(b => b.studentId === student.id);
            
            return (
            <div key={student.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${isMainStudent ? 'ring-2 ring-indigo-500 border-transparent scale-[1.01]' : 'border-slate-200'} ${isExcluded ? 'opacity-50 grayscale select-none' : ''}`}>
              <div className={`p-4 border-b flex justify-between items-center ${isMainStudent ? 'bg-indigo-50/50' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                    <button 
                        type="button"
                        onClick={() => toggleStudentExclusion(student.id)}
                        className={`p-1.5 rounded-lg border-2 transition-all ${isExcluded ? 'bg-red-500 border-red-600 text-white' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}
                    >
                        {isExcluded ? <UserMinus size={18} /> : <UserCheck size={18} />}
                    </button>
                    <span className="font-black uppercase text-slate-800 flex items-center gap-2 text-sm">
                        {student.name} ({student.className})
                        {isMainStudent && <span className="bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-full ml-2">PRIMARY</span>}
                    </span>
                </div>
                <span className="text-[11px] font-black text-red-500 underline decoration-2">DUE: ₹{student.currentBalance || 0}</span>
              </div>
              
              {!isExcluded ? (
                <>
                <div className="p-6 grid grid-cols-4 md:grid-cols-6 gap-2 border-b">
                    {monthsList.map(m => {
                        const isPaid = student?.fees?.[activeSession]?.[m]?.status === "Paid";
                        const isSelected = (selectedMonths[student.id] || []).includes(m);
                        return (
                            <button 
                              key={m} 
                              type="button" 
                              onClick={() => isPaid ? handleViewOldReceipt(student.id, m) : toggleMonth(student.id, m)}
                              className={`p-2 rounded-xl border-2 text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1
                                ${isPaid ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
                            >
                              {isPaid && <Printer size={12} />}
                              {m}
                            </button>
                        )
                    })}
                </div>

                <div className="bg-white">
                    <table className="w-full text-[11px]">
                    <tbody className="divide-y">
                        {studentBreakdown?.items.map((item, i) => (
                        <tr key={i} className={`font-bold ${!item.isChecked ? 'opacity-40 bg-slate-50' : ''}`}>
                            <td className="p-3 w-10 text-center">
                            <input type="checkbox" checked={item.isChecked} onChange={() => toggleTableItem(student.id, item.feeKey)} className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                            </td>
                            <td className="p-3 text-slate-700 uppercase">{item.name}</td>
                            <td className="p-3 text-right font-mono font-black text-slate-900">₹{item.total}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                </>
              ) : (
                <div className="p-8 text-center bg-slate-50">
                    <p className="text-red-500 font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                         Fees Excluded for this billing
                    </p>
                </div>
              )}
            </div>
          )})}
          
          <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-slate-300">
            <h3 className="text-[10px] font-black text-indigo-600 uppercase mb-4 tracking-widest text-center">Extra Charges / Fine</h3>
            <div className="flex gap-3 mb-4">
              <input id="ex_name" type="text" placeholder="Reason (e.g. Fine)" className="flex-1 bg-slate-50 border p-3 rounded-xl outline-none focus:border-indigo-500 font-bold shadow-inner" />
              <input id="ex_amt" type="number" placeholder="Amount" className="w-32 bg-slate-50 border p-3 rounded-xl outline-none focus:border-indigo-500 font-bold shadow-inner" />
              <button type="button" onClick={() => { addExtraCharge(document.getElementById('ex_name').value, document.getElementById('ex_amt').value); document.getElementById('ex_name').value=''; document.getElementById('ex_amt').value=''; }} className="bg-indigo-600 text-white px-5 rounded-xl font-bold active:scale-95 shadow-md"><PlusCircle size={20}/></button>
            </div>
            {extraCharges.map(ex => (
              <div key={ex.id} className="flex justify-between items-center bg-amber-50 p-2 px-4 rounded-xl border border-amber-100 mb-2">
                <span className="text-[10px] font-bold uppercase text-amber-800">{ex.name}</span>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-amber-900">₹{ex.total}</span>
                  <button type="button" onClick={() => setExtraCharges(extraCharges.filter(c => c.id !== ex.id))} className="text-red-500"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border sticky top-4 space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-2xl text-center border-b-4 border-indigo-500 shadow-lg">
                <p className="text-[10px] opacity-50 uppercase font-black tracking-widest text-indigo-300">Net Payable</p>
                <p className="text-4xl font-black font-mono text-indigo-400">₹{netPayable.toFixed(2)}</p>
            </div>

            <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-amber-600 uppercase px-1">Special Discount</label>
                  <input type="number" className="w-full bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl text-xl font-black outline-none focus:border-amber-500 shadow-inner" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Received Amount</label>
                  <input type="number" className="w-full bg-slate-50 border-2 p-5 rounded-2xl text-3xl font-black outline-none focus:border-indigo-600 shadow-inner" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} placeholder="0" />
                  {!amountReceived && <p className="text-[10px] text-red-500 font-bold mt-1 animate-pulse">* Received amount required</p>}
                </div>
            </div>
            
            <div className={`p-5 rounded-2xl border-2 text-center transition-all ${finalNewBalance > 0 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                <p className="text-[10px] uppercase opacity-70 font-black tracking-widest">New Family Balance Due</p>
                <p className="text-3xl font-black font-mono">₹{finalNewBalance.toFixed(2)}</p>
            </div>

            <button 
              onClick={handleSaveAndPrint} 
              disabled={isProcessing || !canPay} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all uppercase tracking-widest border-b-4 border-indigo-900"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <Printer size={24} />} SAVE & PRINT ALL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentBilling;