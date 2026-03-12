import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Save, Loader2, Trash2, Plus, X, IndianRupee } from 'lucide-react';

const MonthlyFeeSetup = () => {
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  
  const [feeHeads, setFeeHeads] = useState([]); 
  const [availableFees, setAvailableFees] = useState([]); 
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [feeName, setFeeName] = useState('');
  const [feeAmount, setFeeAmount] = useState(''); // Naya state amount ke liye
  const [selectedMonths, setSelectedMonths] = useState([]);

  // 1. Data Load Karna
  const fetchData = async () => {
    try {
      // Fee Settings (Jahan heads pre-defined hain)
      const settingsSnapshot = await getDocs(collection(db, "fee_settings"));
      setAvailableFees(settingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fee Master (Jo schedule ho chuke hain)
      const masterSnapshot = await getDocs(collection(db, "fee_master"));
      setFeeHeads(masterSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) { console.error("Fetch error:", e); }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Dropdown change handle karein aur automatic amount bharein
  const handleSelectChange = (e) => {
    const name = e.target.value;
    setFeeName(name);
    
    // Available fees mein se amount dhundo
    const selectedFee = availableFees.find(f => f.name === name);
    if (selectedFee) {
      setFeeAmount(selectedFee.amount || ''); // Amount automatic set ho gaya
    } else {
      setFeeAmount('');
    }
  };

  const toggleMonth = (month) => {
    setSelectedMonths(prev => 
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  // 2. Save Logic
  const handleSave = async () => {
    if (!feeName || !feeAmount || selectedMonths.length === 0) {
      return alert("Pahle Name, Amount aur Months select karein!");
    }
    
    setLoading(true);
    try {
      const newEntry = { 
        name: feeName, 
        amount: Number(feeAmount), // Number mein convert karke save karein
        months: selectedMonths, 
        createdAt: new Date() 
      };
      
      // Agar naya naam likha hai, toh settings mein bhi save karein
      if (isAddingNew) {
        await addDoc(collection(db, "fee_settings"), { name: feeName, amount: Number(feeAmount) });
      }

      await addDoc(collection(db, "fee_master"), newEntry);
      
      // Reset Form
      setFeeName('');
      setFeeAmount('');
      setSelectedMonths([]);
      setIsAddingNew(false);
      fetchData(); 
      alert("Success! Master Ledger update ho gaya.");
    } catch (e) { 
      console.error(e); 
      alert("Save karne mein error aaya!");
    }
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-6 bg-slate-100 min-h-screen font-sans text-slate-800">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mb-8">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black italic tracking-tight">FEE SCHEDULING MANAGER</h2>
            <p className="text-slate-400 text-xs font-bold uppercase">Assign heads to specific months</p>
          </div>
          <button 
            onClick={() => { setIsAddingNew(!isAddingNew); setFeeName(''); setFeeAmount(''); }}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
          >
            {isAddingNew ? <><X size={16}/> USE LIST</> : <><Plus size={16}/> ADD NEW HEAD</>}
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Fee Name & Amount */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Fee Heading</label>
                  {isAddingNew ? (
                    <input 
                      type="text"
                      className="w-full border-2 border-slate-100 p-3 rounded-2xl outline-none focus:border-blue-500 bg-slate-50 font-bold transition-all"
                      placeholder="e.g. Computer Fee"
                      value={feeName}
                      onChange={(e) => setFeeName(e.target.value)}
                    />
                  ) : (
                    <select 
                      className="w-full border-2 border-slate-100 p-3 rounded-2xl outline-none focus:border-blue-500 bg-slate-50 font-bold cursor-pointer transition-all"
                      value={feeName}
                      onChange={handleSelectChange}
                    >
                      <option value="">-- Choose Head --</option>
                      {availableFees.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Base Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><IndianRupee size={16}/></span>
                    <input 
                      type="number"
                      className="w-full border-2 border-slate-100 p-3 pl-10 rounded-2xl outline-none focus:border-blue-500 bg-slate-50 font-mono font-bold transition-all"
                      placeholder="0.00"
                      value={feeAmount}
                      onChange={(e) => setFeeAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Months Selection */}
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Active Months</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {months.map(m => (
                  <button
                    key={m}
                    onClick={() => toggleMonth(m)}
                    className={`py-2.5 rounded-xl border-2 text-[10px] font-black transition-all ${selectedMonths.includes(m) ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-50 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} 
              SAVE TO MASTER LEDGER
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <th className="p-5 border-r border-slate-100">Fee Details</th>
                {months.map(m => <th key={m} className="p-3 text-center border-r border-slate-100">{m}</th>)}
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feeHeads.map((head) => (
                <tr key={head.id} className="hover:bg-blue-50/30 transition-all group">
                  <td className="p-5 border-r border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-slate-900 font-black text-sm">{head.name}</span>
                      <span className="text-emerald-600 font-mono font-bold text-xs flex items-center">
                        <IndianRupee size={10}/>{head.amount}
                      </span>
                    </div>
                  </td>
                  {months.map(m => (
                    <td key={m} className="p-2 text-center border-r border-slate-100">
                      <div className={`w-3 h-3 mx-auto rounded-full ${head.months.includes(m) ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-slate-200'}`}></div>
                    </td>
                  ))}
                  <td className="p-2 text-center">
                    <button 
                      onClick={async () => { if(window.confirm("Delete karein?")) { await deleteDoc(doc(db, "fee_master", head.id)); fetchData(); } }} 
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonthlyFeeSetup;