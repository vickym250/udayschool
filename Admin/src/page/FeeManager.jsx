import React, { useState, useEffect } from "react";
import { db } from "../firebase"; 
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Trash2, PlusCircle } from "lucide-react"; // Icons ke liye

const FeeManager = () => {
  const [selectedClass, setSelectedClass] = useState("LKG");
  const [loading, setLoading] = useState(false);
  
  // Ab fees ek dynamic object hoga
  const [fees, setFees] = useState({});
  const [newFieldName, setNewFieldName] = useState("");

  const classes = ["Play Group", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

  useEffect(() => {
    const fetchFees = async () => {
      setLoading(true);
      const docRef = doc(db, "FeePlans", selectedClass);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // Sirf fees waale fields nikaalna (exclude className/lastUpdated)
        const { className, lastUpdated, ...feeData } = docSnap.data();
        setFees(feeData);
      } else {
        // Default fields agar data na mile
        setFees({ regFee: 0, admissionFee: 0, monthlyFee: 0 });
      }
      setLoading(false);
    };
    fetchFees();
  }, [selectedClass]);

  // 1. Naya Field Add Karne ka Function
  const addField = () => {
    if (!newFieldName.trim()) return alert("Field ka naam likho!");
    const formattedName = newFieldName.trim().replace(/\s+/g, ''); // Space hatane ke liye
    if (fees[formattedName] !== undefined) return alert("Ye field pehle se hai!");

    setFees({ ...fees, [formattedName]: 0 });
    setNewFieldName("");
  };

  // 2. Field Delete Karne ka Function
  const deleteField = (key) => {
    const updatedFees = { ...fees };
    delete updatedFees[key];
    setFees(updatedFees);
  };

  const handleChange = (key, value) => {
    setFees({ ...fees, [key]: Number(value) });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "FeePlans", selectedClass), {
        ...fees,
        className: selectedClass,
        lastUpdated: new Date()
      });
      alert(`Class ${selectedClass} settings saved!`);
    } catch (err) {
      alert("Error: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-slate-800 p-6 text-white flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold italic text-yellow-400">VTECH250 FEE MASTER</h1>
            <select 
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="mt-2 p-2 rounded bg-slate-700 border-none font-bold outline-none"
            >
              {classes.map(cls => <option key={cls} value={cls}>Class: {cls}</option>)}
            </select>
          </div>

          {/* ADD NEW FIELD UI */}
          <div className="flex items-center gap-2 bg-slate-700 p-2 rounded-lg">
            <input 
              type="text" 
              placeholder="New Fee Name..." 
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              className="bg-transparent border-b border-slate-500 outline-none px-2 text-sm w-32"
            />
            <button onClick={addField} className="text-green-400 hover:text-green-300">
              <PlusCircle size={24} />
            </button>
          </div>
        </div>

        {/* DYNAMIC FIELDS LIST */}
        <div className="p-6">
          {loading ? (
            <p className="text-center py-10">Loading...</p>
          ) : (
            <div className="space-y-4">
              {Object.keys(fees).map((key) => (
                <div key={key} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                  <label className="font-semibold text-gray-700 flex-1 capitalize">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </label>
                  
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400 text-sm">₹</span>
                      <input
                        type="number"
                        value={fees[key]}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="pl-7 pr-3 py-2 border rounded-lg w-28 text-right font-bold text-blue-600 outline-none focus:border-blue-500"
                      />
                    </div>
                    
                    {/* DELETE BUTTON */}
                    <button 
                      onClick={() => deleteField(key)}
                      className="text-red-400 hover:text-red-600 transition"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-100 border-t">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition"
          >
            {loading ? "SAVING..." : "SAVE ALL CHANGES"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeeManager;