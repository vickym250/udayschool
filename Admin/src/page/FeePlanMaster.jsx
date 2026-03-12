import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { Edit3, X, Save, Loader2, PlusCircle, Trash2, IndianRupee, RefreshCw, Copy, Calculator } from 'lucide-react';

const FeePlanMaster = () => {
  const [classes, setClasses] = useState([]);
  const [feeItems, setFeeItems] = useState([]); 
  const [classFees, setClassFees] = useState({}); 
  const [selectedClass, setSelectedClass] = useState(null);
  const [modalData, setModalData] = useState({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [newClassName, setNewClassName] = useState('');
  const [newSection, setNewSection] = useState('');
  const [copySource, setCopySource] = useState('');

  const classOptions = ["Nursery", "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
  const sectionOptions = ["", "A", "B", "C", "D", "E"];

  const sortClasses = (list) => list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const classSnap = await getDocs(collection(db, "classes"));
      setClasses(sortClasses(classSnap.docs.map(d => ({ id: d.id, ...d.data() }))));

      const itemSnap = await getDocs(collection(db, "fee_master"));
      const masterHeads = itemSnap.docs.map(d => ({
        name: d.data().name,
        amount: d.data().amount || 0 
      })).filter(head => head.name);
      setFeeItems(masterHeads);

      const planSnap = await getDocs(collection(db, "fee_plans"));
      const plans = {};
      planSnap.forEach(d => { plans[d.id] = d.data() });
      setClassFees(plans);
    } catch (error) {
      console.error(error);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- NEW: EDIT PRE-FILL LOGIC ---
  const openEditModal = (clsName) => {
    setSelectedClass(clsName);
    const existingFees = classFees[clsName] || {};
    const preFilledData = {};
    
    // Agar database mein fees hai toh wo, warna master ledger wala default amount
    feeItems.forEach(item => {
      preFilledData[item.name] = existingFees[item.name] !== undefined ? existingFees[item.name] : item.amount;
    });
    setModalData(preFilledData);
  };

  // --- TOTAL CALCULATION LOGIC ---
  const calculateTotal = (clsName) => {
    const fees = classFees[clsName] || {};
    return Object.values(fees).reduce((sum, val) => sum + (Number(val) || 0), 0);
  };

  const handleAddClass = async () => {
    if (!newClassName) return alert("Pahle Class select karein!");
    const fullName = newSection ? `${newClassName}-${newSection}` : newClassName;
    if (classes.some(c => c.name === fullName)) return alert("Class already exists!");

    setActionLoading(true);
    try {
      await addDoc(collection(db, "classes"), { 
        name: fullName, 
        baseName: newClassName, 
        section: newSection || "None" 
      });

      const feesToSet = {};
      if (copySource && classFees[copySource]) {
        feeItems.forEach(item => {
          feesToSet[item.name] = classFees[copySource][item.name] || 0;
        });
      } else {
        feeItems.forEach(item => { 
          feesToSet[item.name] = Number(item.amount) || 0; 
        });
      }
      
      await setDoc(doc(db, "fee_plans", fullName), feesToSet);
      setNewClassName(''); setNewSection(''); setCopySource('');
      await fetchData(); 
    } catch (e) { console.error(e); } finally { setActionLoading(false); }
  };

  const handleSavePlan = async () => {
    if (!selectedClass) return;
    setActionLoading(true);
    try {
      const dataToSave = {};
      feeItems.forEach(item => {
        dataToSave[item.name] = Number(modalData[item.name]) || 0;
      });
      await setDoc(doc(db, "fee_plans", selectedClass), dataToSave);
      setClassFees(prev => ({ ...prev, [selectedClass]: dataToSave }));
      setSelectedClass(null);
    } catch (e) { alert("Error saving!"); } finally { setActionLoading(false); }
  };

  const handleDeleteClass = async (id, name) => {
    if(window.confirm(`${name} ko delete karein?`)) {
      setActionLoading(true);
      try {
        await deleteDoc(doc(db, "classes", id));
        await fetchData();
      } catch (e) { console.error(e); } finally { setActionLoading(false); }
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen font-sans">
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[500] flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-2" />
          <p className="font-bold text-slate-400 uppercase tracking-widest italic">Syncing Data...</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* ADD CLASS SECTION */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 uppercase italic mb-6">
            <RefreshCw className={loading ? "animate-spin" : "text-blue-600"} /> Fee Plan Master
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <select className="bg-white border-2 border-slate-200 p-3 rounded-xl font-bold outline-none" value={newClassName} onChange={e => setNewClassName(e.target.value)}>
              <option value="">-- CLASS --</option>
              {classOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>

            <select className="bg-white border-2 border-slate-200 p-3 rounded-xl font-bold outline-none" value={newSection} onChange={e => setNewSection(e.target.value)}>
              <option value="">SECTION</option>
              {sectionOptions.filter(s => s).map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select className="w-full bg-white border-2 border-blue-50 p-3 rounded-xl font-bold outline-none text-blue-600" value={copySource} onChange={e => setCopySource(e.target.value)}>
                <option value="">-- USE MASTER RATES --</option>
                {classes.map(c => <option key={c.id} value={c.name}>COPY FROM {c.name}</option>)}
            </select>

            <button onClick={handleAddClass} disabled={actionLoading} className="bg-blue-600 text-white p-3 rounded-xl font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
              {actionLoading ? <Loader2 className="animate-spin" /> : <PlusCircle size={18}/>} ADD CLASS
            </button>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest">Class</th>
                  {feeItems.map(item => (
                    <th key={item.name} className="p-5 text-center text-[10px] font-black uppercase tracking-widest border-l border-white/10">{item.name}</th>
                  ))}
                  <th className="p-5 text-center text-[10px] font-black uppercase tracking-widest border-l border-white/10 bg-blue-900/50">Total</th>
                  <th className="p-5 text-center text-[10px] font-black uppercase tracking-widest border-l border-white/10">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((cls) => (
                  <tr key={cls.id} className="hover:bg-blue-50/50 transition-all group">
                    <td className="p-5 font-black text-slate-700">
                      <div className="flex justify-between items-center gap-4">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs">{cls.name}</span>
                        <button onClick={() => handleDeleteClass(cls.id, cls.name)} className="opacity-0 group-hover:opacity-100 text-red-400 transition-all"><Trash2 size={16}/></button>
                      </div>
                    </td>
                    {feeItems.map(item => (
                      <td key={item.name} className="p-5 text-center border-l border-slate-50 font-mono text-sm">
                        <span className={classFees[cls.name]?.[item.name] > 0 ? "text-slate-600 font-bold" : "text-slate-300"}>
                          ₹{classFees[cls.name]?.[item.name] || 0}
                        </span>
                      </td>
                    ))}
                    <td className="p-5 text-center border-l border-slate-100 bg-blue-50/30">
                      <span className="text-blue-700 font-black text-base italic">₹{calculateTotal(cls.name)}</span>
                    </td>
                    <td className="p-5 text-center border-l border-slate-50">
                      <button onClick={() => openEditModal(cls.name)} className="bg-slate-100 p-2.5 rounded-xl text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                        <Edit3 size={18}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {selectedClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[600] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 italic">Assigning Fees to</p>
                <h3 className="text-2xl font-bold tracking-tight italic uppercase">{selectedClass}</h3>
              </div>
              <button onClick={() => setSelectedClass(null)} className="p-2 hover:bg-white/10 rounded-full transition"><X /></button>
            </div>
            
            <div className="p-8 space-y-5 max-h-[55vh] overflow-y-auto custom-scrollbar">
              {feeItems.map(item => (
                <div key={item.name} className="space-y-1 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-500 transition-colors">
                    {item.name} 
                    <span className="ml-2 text-[8px] text-slate-300 font-medium italic">(Master: ₹{item.amount})</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500"><IndianRupee size={16}/></span>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-black text-lg outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                      value={modalData[item.name] ?? ''} 
                      onChange={e => setModalData({...modalData, [item.name]: e.target.value})} 
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-xs font-black text-slate-400 uppercase">Estimated Total</span>
                <span className="text-xl font-black text-blue-600 italic">₹{Object.values(modalData).reduce((a, b) => a + (Number(b) || 0), 0)}</span>
              </div>
              <button onClick={handleSavePlan} disabled={actionLoading} className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-100">
                {actionLoading ? <Loader2 className="animate-spin" /> : <Save />} UPDATE PLAN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeePlanMaster;