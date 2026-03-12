import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { IndianRupee, Loader2, Printer, Plus, User, Gift } from 'lucide-react';
import SalaryReceipt from '../component/SalaryReceipt';
import toast from 'react-hot-toast';

const TeacherBilling = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [teacherData, setTeacherData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("Jan");
  const [amountPaid, setAmountPaid] = useState("");
  const [bonusAmount, setBonusAmount] = useState(""); 
  const [extraAdjustments, setExtraAdjustments] = useState([]);
  const [applyLeaveCut, setApplyLeaveCut] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const monthsList = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

  // --- 🟢 Data Fetching ---
  const fetchTeacher = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, "teachers", id));
      if (docSnap.exists()) {
        setTeacherData(docSnap.data());
      } else {
        toast.error("Teacher not found!");
        navigate("/teachers");
      }
    } catch (e) { 
      console.error("Error fetching teacher:", e); 
      toast.error("Data load karne mein error aaya");
    }
    setLoading(false);
  };

  useEffect(() => { fetchTeacher(); }, [id]);

  const isAlreadyPaid = useMemo(() => {
    return teacherData?.salaryDetails?.[selectedMonth] ? true : false;
  }, [teacherData, selectedMonth]);

  // Data reset on month change
  useEffect(() => {
    if (isAlreadyPaid) {
      const record = teacherData.salaryDetails[selectedMonth];
      setAmountPaid(record.paid);
      setBonusAmount(record.bonus || "");
    } else {
      setAmountPaid(""); 
      setBonusAmount("");
      setExtraAdjustments([]); 
      setApplyLeaveCut(false);
    }
  }, [isAlreadyPaid, selectedMonth, teacherData]);

  const stats = useMemo(() => {
    const currentYear = 2026;
    const monthMap = { 
        "Jan": "January", "Feb": "February", "Mar": "March", "Apr": "April", 
        "May": "May", "Jun": "June", "Jul": "July", "Aug": "August", 
        "Sep": "September", "Oct": "October", "Nov": "November", "Dec": "December" 
    };
    const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const fullMonthName = monthMap[selectedMonth];
    const monthIndex = allMonths.indexOf(selectedMonth); 
    const year = ["Jan", "Feb", "Mar"].includes(selectedMonth) ? currentYear : currentYear - 1;
    
    const attendanceEntries = Object.keys(teacherData?.attendance || {}).filter(key => key.includes(fullMonthName));
    const p = attendanceEntries.filter(k => teacherData.attendance[k] === "P").length;
    const a = attendanceEntries.filter(k => teacherData.attendance[k] === "A").length;
    const l = attendanceEntries.filter(k => teacherData.attendance[k] === "L").length;
    
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    return { present: p, absent: a, leave: l, total: daysInMonth, fullName: fullMonthName, year };
  }, [teacherData, selectedMonth]);

  const salaryCalc = useMemo(() => {
    if (!teacherData) return { base: 0, net: 0, due: 0, cut: 0, prevDue: 0, bonus: 0 };
    
    const base = Number(teacherData.salary || 0);
    const bonus = Number(bonusAmount || 0); 

    if (isAlreadyPaid) {
        const record = teacherData.salaryDetails[selectedMonth];
        return { 
            base: record.baseSalary || base, 
            net: record.totalPayable, 
            due: record.due, 
            cut: record.cutAmount || 0, 
            prevDue: record.prevDueApplied || 0, 
            bonus: record.bonus || 0 
        }; 
    }

    const prevDue = Number(teacherData.pendingDue || 0); 
    const perDaySalary = base / stats.total; 
    const cutAmount = applyLeaveCut ? Math.round((stats.absent + stats.leave) * perDaySalary) : 0;
    const adjustments = extraAdjustments.reduce((acc, curr) => acc + curr.amount, 0);
    
    const netPayable = Math.round(base - cutAmount + adjustments + prevDue + bonus);
    
    return { 
        base, 
        net: netPayable, 
        due: netPayable - Number(amountPaid || 0), 
        cut: cutAmount, 
        prevDue, 
        bonus 
    };
  }, [teacherData, applyLeaveCut, stats, extraAdjustments, amountPaid, bonusAmount, isAlreadyPaid, selectedMonth]);

  // --- 🟢 FIXED: Save Logic with No Reload ---
  const handleSave = async () => {
    if (isAlreadyPaid) return;
    if (!amountPaid || Number(amountPaid) < 0) return toast.error("Kripya valid amount bharein!");
    
    setIsProcessing(true);
    try {
      const payDate = new Date().toISOString();
      const teacherRef = doc(db, "teachers", id);

      const salaryEntry = {
        baseSalary: salaryCalc.base,
        paid: Number(amountPaid),
        bonus: Number(bonusAmount || 0),
        prevDueApplied: salaryCalc.prevDue,
        totalPayable: salaryCalc.net,
        due: salaryCalc.due,
        cutAmount: salaryCalc.cut,
        paidAt: payDate,
      };

      // Atomic update in Firestore
      await updateDoc(teacherRef, {
        [`salaryDetails.${selectedMonth}`]: salaryEntry,
        pendingDue: salaryCalc.due,
      });

      // UI Update without reload
      setTeacherData(prev => ({
        ...prev,
        salaryDetails: {
            ...prev.salaryDetails,
            [selectedMonth]: salaryEntry
        },
        pendingDue: salaryCalc.due
      }));

      toast.success("Salary Paid Successfully!");
      setShowReceipt(true);
      
    } catch (e) { 
        console.error("Save error:", e); 
        toast.error("Save karne mein dikkat aayi!"); 
    }
    setIsProcessing(false);
  };

  // Receipt close hone par data refresh karlo bina reload ke
  const handleCloseReceipt = () => {
    setShowReceipt(false);
    fetchTeacher(); // Latest sync ke liye
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FD] p-4 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Profile Card */}
        <div className="bg-[#1A1A40] text-white p-6 rounded-3xl flex justify-between items-center shadow-lg border-b-4 border-indigo-500">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500 p-3 rounded-2xl shadow-inner"><User size={24}/></div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">{teacherData?.name}</h1>
              <p className="text-xs font-bold opacity-60 uppercase tracking-widest">
                Base: ₹{teacherData?.salary} | <span className="text-yellow-400">Dues: ₹{teacherData?.pendingDue || 0}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
             {isAlreadyPaid && <span className="bg-emerald-500 text-[10px] px-3 py-1 rounded-full font-black mr-2 shadow-sm">PAID</span>}
             <p className="text-lg font-black text-yellow-400 tracking-tighter">{selectedMonth} {stats.year}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            
            {/* Month Selection */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Select Payment Month</h3>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mb-8">
                {monthsList.map(m => (
                    <button key={m} onClick={() => setSelectedMonth(m)} className={`py-3 rounded-2xl text-xs font-black border relative transition-all active:scale-95 ${selectedMonth === m ? "bg-indigo-600 text-white shadow-lg border-indigo-600" : "bg-white text-slate-500 border-slate-100 hover:border-indigo-200"}`}>
                        {m}
                        {teacherData?.salaryDetails?.[m] && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>}
                    </button>
                ))}
              </div>

              {/* Attendance Stats */}
              <div className="grid grid-cols-3 gap-3">
                 <div className="bg-emerald-50 p-4 rounded-2xl text-center border border-emerald-100">
                    <p className="text-2xl font-black text-emerald-600">{stats.present}</p>
                    <p className="text-[9px] font-black text-emerald-400 uppercase">Present</p>
                 </div>
                 <div className="bg-rose-50 p-4 rounded-2xl text-center border border-rose-100">
                    <p className="text-2xl font-black text-rose-600">{stats.absent + stats.leave}</p>
                    <p className="text-[9px] font-black text-rose-400 uppercase">Absent/Leave</p>
                 </div>
                 <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100">
                    <p className="text-2xl font-black text-blue-600">{stats.total}</p>
                    <p className="text-[9px] font-black text-blue-400 uppercase">Month Days</p>
                 </div>
              </div>

              {!isAlreadyPaid && (
                  <button onClick={() => setApplyLeaveCut(!applyLeaveCut)} className={`w-full mt-6 py-4 rounded-2xl font-black text-[10px] uppercase border-2 flex items-center justify-center gap-2 transition-all ${applyLeaveCut ? "bg-rose-600 text-white border-rose-600 shadow-md" : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"}`}>
                    {applyLeaveCut ? `Leave Deduction Applied: -₹${salaryCalc.cut}` : "Apply Absent Salary Cut"}
                  </button>
              )}
            </div>

            {/* Adjustments and Bonus */}
            {!isAlreadyPaid && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Other Fines / Deductions</h3>
                        <div className="flex gap-2">
                            <input id="adj_name" placeholder="Reason (e.g. Fine)" className="flex-1 bg-slate-50 p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 ring-indigo-100 transition-all border border-transparent focus:bg-white" />
                            <input id="adj_amt" type="number" placeholder="₹" className="w-24 bg-slate-50 p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 ring-indigo-100 transition-all border border-transparent focus:bg-white" />
                            <button onClick={() => {
                                const n = document.getElementById('adj_name').value;
                                const a = document.getElementById('adj_amt').value;
                                if(n && a) { 
                                    setExtraAdjustments([...extraAdjustments, {name: n, amount: -Math.abs(Number(a))}]); 
                                    document.getElementById('adj_name').value = "";
                                    document.getElementById('adj_amt').value = "";
                                } else { toast.error("Details bharein"); }
                            }} className="bg-indigo-600 text-white px-6 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg active:scale-90"><Plus size={20}/></button>
                        </div>
                        {extraAdjustments.map((ex, i) => (
                           <div key={i} className="flex justify-between items-center bg-rose-50 p-3 mt-2 rounded-xl text-rose-700 text-xs font-bold border border-rose-100">
                             <span>{ex.name}</span>
                             <span>₹{ex.amount}</span>
                           </div>
                        ))}
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-emerald-500 uppercase mb-4 tracking-widest flex items-center gap-2"><Gift size={16}/> Bonus Amount</h3>
                        <input type="number" value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 p-4 rounded-xl text-sm font-black outline-none focus:ring-2 ring-emerald-100 border border-transparent focus:bg-white transition-all" />
                    </div>
                </div>
            )}
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#1A1A40] text-white p-8 rounded-[2.5rem] text-center shadow-xl border-b-4 border-indigo-500">
               <p className="text-[9px] opacity-40 uppercase font-black mb-1 tracking-[4px]">Net Payable</p>
               <h2 className="text-5xl font-black text-yellow-400 tracking-tighter font-mono">₹{salaryCalc.net}</h2>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Payment Amount</p>
               <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                  <input 
                    type="number" 
                    value={amountPaid} 
                    disabled={isAlreadyPaid} 
                    onChange={(e) => setAmountPaid(e.target.value)} 
                    placeholder="Enter Paid Amount" 
                    className="w-full p-5 pl-12 rounded-2xl text-2xl font-black bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all outline-none" 
                  />
               </div>
               <div className={`p-4 rounded-2xl flex justify-between items-center transition-all ${salaryCalc.due > 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                  <span className="text-[9px] font-black uppercase tracking-widest">Carry Forward</span>
                  <span className="text-xl font-black font-mono">₹{salaryCalc.due}</span>
               </div>
            </div>

            <button 
              onClick={() => isAlreadyPaid ? setShowReceipt(true) : handleSave()} 
              disabled={isProcessing || (!isAlreadyPaid && !amountPaid)} 
              className={`w-full py-6 rounded-3xl font-black uppercase text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${isAlreadyPaid ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'} text-white disabled:bg-slate-300 disabled:shadow-none`}
            >
                {isProcessing ? <Loader2 className="animate-spin"/> : <><Printer size={18}/> {isAlreadyPaid ? "Re-Print Receipt" : "Save & Print Receipt"}</>}
            </button>
          </div>
        </div>
      </div>

      {showReceipt && (
        <SalaryReceipt 
          teacherName={teacherData?.name} 
          subject={teacherData?.subject}
          phone={teacherData?.phone}
          month={`${stats.fullName} ${stats.year}`} 
          totalAmount={salaryCalc.base}
          paidAmount={amountPaid}
          bonus={salaryCalc.bonus}
          prevDue={salaryCalc.prevDue} 
          balance={salaryCalc.due}
          absents={stats.absent + stats.leave}
          totalDays={stats.total}
          cutAmount={salaryCalc.cut}
          paidAt={isAlreadyPaid ? teacherData?.salaryDetails?.[selectedMonth]?.paidAt : new Date().toISOString()}
          onClose={handleCloseReceipt} 
        />
      )}
    </div>
  );
};

export default TeacherBilling;