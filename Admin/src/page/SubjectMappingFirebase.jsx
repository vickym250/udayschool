import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase'; 
import { doc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { Trash2, Plus, Save, BookOpen, CheckCircle2, Loader2 } from 'lucide-react';

const SubjectMappingFirebase = () => {
  const defaultSubjects = [
    "Hindi", "English", "Mathematics", "EVS", 
    "Science", "Social Science", "Sanskrit", "Computer", "G.K."
  ];

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [mapping, setMapping] = useState({});
  const [allSubjects, setAllSubjects] = useState(defaultSubjects);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialFetch, setInitialFetch] = useState(true);

  // 1. Fetch Classes (Optimized)
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "classes"));
        const classesList = querySnapshot.docs.map(doc => doc.data().name);
        
        const sortedClasses = classesList.sort((a, b) => 
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );

        setClasses(sortedClasses);
        if (sortedClasses.length > 0) setSelectedClass(sortedClasses[0]);
      } catch (err) {
        console.error("Error fetching classes:", err);
      } finally {
        setInitialFetch(false);
      }
    };
    fetchClasses();
  }, []);

  // 2. Real-time Listener for Master Data
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "school_config", "master_data"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.mapping) setMapping(data.mapping);
        if (data.allSubjects) {
          // Merge default and firebase subjects safely
          const combined = Array.from(new Set([...defaultSubjects, ...data.allSubjects]));
          setAllSubjects(combined);
        }
      }
    });
    return () => unsub();
  }, []);

  const addNewSubjectToMaster = () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) return;
    if (allSubjects.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      alert("Subject already exists!");
      return;
    }
    setAllSubjects([...allSubjects, trimmed]);
    setNewSubjectName("");
  };

  const removeSubjectFromMaster = (sub) => {
    if (defaultSubjects.includes(sub)) {
      alert("Default subjects delete nahi kiye ja sakte!");
      return;
    }
    if (window.confirm(`Kya aap "${sub}" ko master list se hatana chahte hain?`)) {
      const updatedAllSubjects = allSubjects.filter(s => s !== sub);
      setAllSubjects(updatedAllSubjects);

      // Mapping update logic
      const updatedMapping = { ...mapping };
      Object.keys(updatedMapping).forEach(cls => {
        updatedMapping[cls] = updatedMapping[cls].filter(s => s !== sub);
      });
      setMapping(updatedMapping);
    }
  };

  const toggleSubject = (subject) => {
    if (!selectedClass) return;
    const current = mapping[selectedClass] || [];
    const isSelected = current.includes(subject);
    
    const updated = isSelected 
      ? current.filter(s => s !== subject) 
      : [...current, subject];

    setMapping({ ...mapping, [selectedClass]: updated });
  };

  const saveToFirebase = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "school_config", "master_data"), {
        mapping,
        allSubjects: allSubjects.filter(s => !defaultSubjects.includes(s)) // Save only custom subjects to save storage
      });
      alert("Mapping Saved Successfully! ✅");
    } catch (error) {
      console.error(error);
      alert("Error saving data");
    } finally {
      setLoading(false);
    }
  };

  if (initialFetch) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-100">
              <BookOpen className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase italic text-slate-800">Subject Mapping</h1>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Sync subjects with school classes</p>
            </div>
          </div>
          <button 
            onClick={saveToFirebase}
            disabled={loading}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            SAVE CONFIGURATION
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANEL */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm transition-transform hover:shadow-md">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">New Subject</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addNewSubjectToMaster()}
                  placeholder="e.g. Robotics"
                  className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-bold transition-all text-sm"
                />
                <button onClick={addNewSubjectToMaster} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-all">
                  <Plus size={24} />
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Select Class</label>
              <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {classes.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`p-4 rounded-2xl text-xs font-black border-2 transition-all ${
                      selectedClass === cls 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-inner translate-y-[1px]' 
                      : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL (GRID) */}
          <div className="lg:col-span-8 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm min-h-[500px]">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
              <h2 className="text-xl font-black uppercase italic text-slate-800">
                Subjects for <span className="text-indigo-600 underline decoration-indigo-200 decoration-4 underline-offset-8">{selectedClass}</span>
              </h2>
              <div className="flex items-center gap-2">
                <div className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  {mapping[selectedClass]?.length || 0} Assigned
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-in slide-in-from-bottom-4 duration-500">
              {allSubjects.map((sub) => {
                const isSelected = mapping[selectedClass]?.includes(sub);
                const isDefault = defaultSubjects.includes(sub);
                
                return (
                  <div key={sub} className="relative group">
                    <button
                      onClick={() => toggleSubject(sub)}
                      className={`w-full p-5 rounded-3xl border-2 transition-all text-left relative overflow-hidden active:scale-95 ${
                        isSelected 
                        ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-50/20 shadow-sm' 
                        : 'border-slate-100 hover:border-indigo-200 bg-slate-50/30'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-[13px] font-black uppercase tracking-tight ${isSelected ? 'text-indigo-700' : 'text-slate-500'}`}>
                          {sub}
                        </span>
                        {isSelected && <CheckCircle2 className="text-indigo-600" size={18} />}
                      </div>
                    </button>
                    
                    {!isDefault && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeSubjectFromMaster(sub); }}
                        className="absolute -top-1 -right-1 bg-white text-red-400 p-1.5 rounded-full shadow-lg border border-red-50 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white z-10"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SubjectMappingFirebase;