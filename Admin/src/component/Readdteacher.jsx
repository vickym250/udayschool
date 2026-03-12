import React, { useEffect, useState } from "react";
import { addDoc, updateDoc, doc, collection, getDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";

// 📅 Auto Session Calculate Function
const calculateSession = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = now.getMonth() + 1; 
  if (month >= 4) {
    return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
  } else {
    return `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
  }
};

const monthsOrder = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];

export function Readdteacher({ close, teacherData }) {
  const REALTIME_SESSION = calculateSession();

  const [form, setForm] = useState({
    name: "",
    subject: "",
    phone: "",
    salary: "",
    address: "",
    session: REALTIME_SESSION,
    joiningDate: "", 
    reAddDate: new Date().toISOString().split("T")[0], 
    photo: null,
    photoURL: "",
    isClassTeacher: false,
    classTeacherOf: "",
  });

  const [masterData, setMasterData] = useState(null);
  const [classList, setClassList] = useState([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const docRef = doc(db, "school_config", "master_data");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data().mapping;
          setMasterData(data);
          setClassList(Object.keys(data));
        }
      } catch (err) { console.error(err); }
    };
    fetchMasterData();

    if (teacherData) {
      setForm((prev) => ({
        ...prev,
        ...teacherData,
        session: REALTIME_SESSION, 
        reAddDate: new Date().toISOString().split("T")[0], 
        photo: null, 
      }));
    }
    setTimeout(() => setShow(true), 10);
  }, [teacherData, REALTIME_SESSION]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleCheckbox = (e) => setForm((prev) => ({ ...prev, isClassTeacher: e.target.checked }));
  const handlePhoto = (e) => setForm((prev) => ({ ...prev, photo: e.target.files[0] }));

  const handleClose = () => {
    setShow(false);
    setTimeout(() => close(), 200);
  };

  const buildSalaryDetails = (monthlySalary) => {
    let obj = {};
    monthsOrder.forEach((m) => {
      obj[m] = { total: Number(monthlySalary), paid: 0, paidAt: null };
    });
    return obj;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalPhotoURL = form.photoURL;
      
      if (form.photo) {
        const imageRef = ref(storage, `teachers/${Date.now()}_${form.photo.name}`);
        await uploadBytes(imageRef, form.photo);
        finalPhotoURL = await getDownloadURL(imageRef);
      }

      const { id, photo, createdAt, attendance, salaryDetails, ...cleanData } = form;

      // 1. 🔥 CREATE NEW DOCUMENT (Fresh start for new session)
      const newDocRef = await addDoc(collection(db, "teachers"), {
        ...cleanData,
        photoURL: finalPhotoURL,
        salaryDetails: buildSalaryDetails(form.salary),
        attendance: {}, 
        status: "active",
        createdAt: serverTimestamp(),
        isDeleted: false // Naya teacher active rahega
      });

      // 2. 🔥 UPDATE OLD DOCUMENT (No deletion, just mark as promoted)
      if (teacherData && teacherData.id) {
        await updateDoc(doc(db, "teachers", teacherData.id), {
          status: "promoted",
          isReaddComplete: true, 
          // ✅ isDeleted: true ko hata diya gaya hai
          nextSessionDocId: newDocRef.id
        });
      }

      toast.success("Teacher Promoted Successfully!");
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error("Error during re-admission!");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center z-[100] p-4 font-sans text-slate-900">
      <div className={`bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden transition-all duration-300 ${show ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        
        <div className="p-6 flex justify-between items-center bg-emerald-600 text-white">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Teacher Promotion</h2>
            <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest italic">New Session: {REALTIME_SESSION}</p>
          </div>
          <button onClick={handleClose} className="text-3xl font-light hover:rotate-90 transition-transform">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-sm bg-white">
               <img src={form.photoURL} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-600 uppercase leading-none mb-1">Promoting Teacher</p>
              <p className="text-lg font-black text-emerald-900 uppercase leading-none">{form.name}</p>
              <p className="text-[10px] text-emerald-500 font-bold uppercase mt-1">Current Session: {teacherData?.session}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-wider">Full Name</label>
              <input name="name" value={form.name} onChange={handleChange} required className="w-full border-2 p-3 rounded-xl focus:border-emerald-500 outline-none font-bold" />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-wider">Assign Subject</label>
              <select name="subject" value={form.subject} onChange={handleChange} required className="w-full border-2 p-3 rounded-xl outline-none font-bold bg-white">
                <option value="">Select Subject</option>
                {masterData && [...new Set(Object.values(masterData).flat())].sort().map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-emerald-600 uppercase ml-1 tracking-wider">Promotion Date</label>
              <input name="reAddDate" type="date" value={form.reAddDate} onChange={handleChange} required className="w-full border-2 p-3 rounded-xl border-emerald-100 outline-none font-bold" />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-wider">New Salary (₹)</label>
              <input name="salary" type="number" value={form.salary} onChange={handleChange} required className="w-full border-2 p-3 rounded-xl outline-none font-bold" />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-wider">Mobile Number</label>
              <input name="phone" value={form.phone} onChange={handleChange} required maxLength={10} className="w-full border-2 p-3 rounded-xl outline-none font-bold" />
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <input type="checkbox" id="isCT_re" checked={form.isClassTeacher} onChange={handleCheckbox} className="w-5 h-5 accent-emerald-600" />
              <label htmlFor="isCT_re" className="font-bold text-slate-700 text-sm cursor-pointer">Set as Class Teacher?</label>
            </div>
            {form.isClassTeacher && (
              <select name="classTeacherOf" value={form.classTeacherOf} onChange={handleChange} required className="w-full p-3 border rounded-xl font-bold bg-white focus:ring-2 ring-emerald-100 outline-none">
                <option value="">Choose Class</option>
                {classList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          <div>
             <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-wider">Address</label>
             <textarea name="address" value={form.address} onChange={handleChange} className="w-full border-2 p-3 rounded-xl outline-none font-bold text-sm" rows="2" />
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-300">
            <div className="flex-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter tracking-wider">Profile Image</label>
              <input type="file" accept="image/*" onChange={handlePhoto} className="w-full text-xs mt-1" />
            </div>
            {(form.photoURL || form.photo) && (
              <img src={form.photo ? URL.createObjectURL(form.photo) : form.photoURL} className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-md" alt="Teacher" />
            )}
          </div>

          <button disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-emerald-100 transition-all active:scale-[0.98] uppercase tracking-widest disabled:bg-slate-300">
            {loading ? "PROCESSING..." : "CONFIRM NEW SESSION PROMOTION"}
          </button>
        </form>
      </div>
    </div>
  );
}