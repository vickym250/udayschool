import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // Apna firebase config path check kar lena
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { Pencil, Trash2, Plus, Check, Loader2, Search, X } from 'lucide-react';

const BusFeeManager = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({ id: null, location: '', charges: '' });
  const [isEditing, setIsEditing] = useState(false);

  // 1. READ: Real-time data fetch (Order by latest)
  useEffect(() => {
    const q = query(collection(db, "bus_fees"), orderBy("location", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setRoutes(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. CREATE & UPDATE
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location || !formData.charges) return;

    // Duplicate Check (Only for New Entry)
    if (!isEditing) {
      const exists = routes.find(r => r.location.toLowerCase() === formData.location.toLowerCase());
      if (exists) {
        alert("Bhai, ye location pehle se list mein hai!");
        return;
      }
    }

    try {
      if (isEditing) {
        const routeRef = doc(db, "bus_fees", formData.id);
        await updateDoc(routeRef, {
          location: formData.location,
          charges: Number(formData.charges)
        });
        setIsEditing(false);
      } else {
        await addDoc(collection(db, "bus_fees"), {
          location: formData.location,
          charges: Number(formData.charges),
          createdAt: new Date()
        });
      }
      setFormData({ id: null, location: '', charges: '' });
    } catch (error) {
      console.error("Error:", error);
      alert("Kuch gadbad ho gayi bhai!");
    }
  };

  // 3. DELETE
  const deleteRoute = async (id) => {
    if (window.confirm("Kya aap is location ki fees delete karna chahte hain?")) {
      try {
        await deleteDoc(doc(db, "bus_fees", id));
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const startEdit = (route) => {
    setFormData(route);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 4. SEARCH FILTER
  const filteredRoutes = routes.filter(route => 
    route.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-blue-600 p-6 text-white text-center">
          <h2 className="text-3xl font-black flex justify-center items-center gap-3">
            🚌 BUS FEE SETTINGS
          </h2>
          <p className="text-blue-100 mt-2 font-medium">Location ke hisaab se monthly fees set karein</p>
        </div>

        <div className="p-6">
          {/* Form Section */}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-white p-6 rounded-2xl border-2 border-dashed border-blue-200">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-gray-600 ml-1">Location Name</label>
              <input
                name="location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Ex: Model Town"
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-gray-600 ml-1">Monthly Charges (₹)</label>
              <input
                name="charges"
                type="number"
                value={formData.charges}
                onChange={(e) => setFormData({...formData, charges: e.target.value})}
                placeholder="Ex: 1200"
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-end gap-2">
              <button 
                type="submit" 
                className={`flex-1 flex items-center justify-center gap-2 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md active:scale-95 ${isEditing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isEditing ? <><Check size={20}/> Update</> : <><Plus size={20}/> Add Location</>}
              </button>
              {isEditing && (
                <button 
                  type="button"
                  onClick={() => {setIsEditing(false); setFormData({id:null, location:'', charges:''})}}
                  className="bg-gray-200 text-gray-600 p-3 rounded-xl hover:bg-gray-300"
                >
                  <X size={24}/>
                </button>
              )}
            </div>
          </form>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-3 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="Search location..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Table Data */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 text-blue-600">
              <Loader2 className="animate-spin mb-2" size={48} />
              <span className="font-bold">Fetching Rates...</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-black">
                  <tr>
                    <th className="p-4">Location</th>
                    <th className="p-4">Monthly Rate</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredRoutes.length > 0 ? filteredRoutes.map((route) => (
                    <tr key={route.id} className="hover:bg-blue-50 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{route.location}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest">Zone Active</div>
                      </td>
                      <td className="p-4">
                        <span className="text-green-600 font-black text-lg">₹{route.charges}</span>
                      </td>
                      <td className="p-4 flex justify-center gap-2">
                        <button 
                          onClick={() => startEdit(route)} 
                          className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white p-2.5 rounded-xl transition-all"
                        >
                          <Pencil size={18}/>
                        </button>
                        <button 
                          onClick={() => deleteRoute(route.id)} 
                          className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white p-2.5 rounded-xl transition-all"
                        >
                          <Trash2 size={18}/>
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" className="p-12 text-center">
                        <div className="text-gray-400 font-medium">Koi location nahi mili bhai!</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Footer Info */}
        <div className="bg-gray-50 p-4 border-t text-center text-xs text-gray-500 font-medium">
          Total Locations: {routes.length} | Master Fee Config Panel
        </div>
      </div>
    </div>
  );
};

export default BusFeeManager;