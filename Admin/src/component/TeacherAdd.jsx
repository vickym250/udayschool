import React, { useEffect, useState } from "react";
import { addDoc, updateDoc, doc, collection, getDoc } from "firebase/firestore";
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

export function AddTeacherPopup({ close, editData }) {
  const [form, setForm] = useState({
    name: "",
    role: "Teacher",
    otherRole: "",
    subject: "",
    phone: "",
    password: "", // ✨ Naya Field: Password
    salary: "",
    address: "",
    session: calculateSession(),
    joiningDate: new Date().toISOString().split("T")[0],
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
      } catch (err) {
        console.error("Master data fetch error:", err);
        toast.error("Classes load nahi ho payi!");
      }
    };

    fetchMasterData();

    if (editData) {
      setForm((s) => ({
        ...s,
        ...editData,
        role: editData.role || "Teacher",
        salary: editData.salary || "",
        password: editData.password || "", // Edit mode mein password load karna
        joiningDate: editData.joiningDate || new Date().toISOString().split("T")[0],
        isClassTeacher: editData.isClassTeacher || false,
        classTeacherOf: editData.classTeacherOf || "",
        photo: null,
      }));
    }
    setTimeout(() => setShow(true), 10);
  }, [editData]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCheckbox = (e) =>
    setForm((prev) => ({ ...prev, isClassTeacher: e.target.checked }));

  const handlePhoto = (e) =>
    setForm((prev) => ({ ...prev, photo: e.target.files[0] }));

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
    
    if (form.phone.length !== 10) {
      toast.error("Phone number 10 digits ka hona chahiye!");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password kam se kam 6 characters ka hona chahiye!");
      return;
    }

    setLoading(true);
    try {
      let photoURL = form.photoURL;

      if (form.photo) {
        const imageRef = ref(storage, `teachers/${Date.now()}_${form.photo.name}`);
        await uploadBytes(imageRef, form.photo);
        photoURL = await getDownloadURL(imageRef);
      }

      const finalRole = form.role === "Other" ? form.otherRole : form.role;

      const teacherData = {
        name: form.name,
        role: finalRole,
        subject: form.role === "Teacher" ? form.subject : "N/A",
        phone: form.phone,
        password: form.password, // ✨ Database mein password jayega
        salary: Number(form.salary),
        address: form.address,
        session: form.session,
        joiningDate: form.joiningDate,
        photoURL,
        isClassTeacher: form.role === "Teacher" ? form.isClassTeacher : false,
        classTeacherOf: (form.role === "Teacher" && form.isClassTeacher) ? form.classTeacherOf : null,
      };

      if (editData) {
        await updateDoc(doc(db, "teachers", editData.id), teacherData);
        toast.success("Staff data updated!");
      } else {
        await addDoc(collection(db, "teachers"), {
          ...teacherData,
          salaryDetails: buildSalaryDetails(form.salary),
          attendance: {},
          createdAt: new Date(),
        });
        toast.success("Staff added successfully!");
      }
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error("Data save nahi ho paya!");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 p-4">
      <div
        className={`bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden transition-all duration-300 ${
          show ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Header */}
        <div className="bg-indigo-600 p-5 flex justify-between items-center text-white">
          <div>
            <h2 className="text-xl font-bold italic">
              {editData ? "Edit Staff Info" : "Register Staff"}
            </h2>
            <p className="text-xs opacity-80">Academic Session: {form.session}</p>
          </div>
          <button onClick={handleClose} className="hover:rotate-90 transition-transform text-2xl">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
              <input name="name" value={form.name} onChange={handleChange} required
                placeholder="Ex: Rajesh Kumar"
                className="w-full border-b-2 border-gray-100 focus:border-indigo-500 outline-none py-2 transition-colors" />
            </div>

            {/* Staff Type Dropdown */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Staff Type (Role)</label>
              <select name="role" value={form.role} onChange={handleChange} required
                className="w-full border-b-2 border-gray-100 focus:border-indigo-500 outline-none py-2 bg-white">
                <option value="Teacher">Teacher</option>
                <option value="Peon">Peon</option>
                <option value="Driver">Driver</option>
                <option value="Guard">Security Guard</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Custom Role Input */}
            {form.role === "Other" && (
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider">Specify Your Role</label>
                <input name="otherRole" value={form.otherRole} onChange={handleChange} required
                  placeholder="Ex: Sweeper, Accountant, etc."
                  className="w-full border-b-2 border-orange-200 focus:border-orange-500 outline-none py-2" />
              </div>
            )}

            {/* Dynamic Subject */}
            {form.role === "Teacher" && (
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subject</label>
                <select name="subject" value={form.subject} onChange={handleChange} required
                  className="w-full border-b-2 border-gray-100 focus:border-indigo-500 outline-none py-2 transition-colors bg-white">
                  <option value="">Select Subject</option>
                  {masterData && [...new Set(Object.values(masterData).flat())].sort().map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Phone (Login ID) */}
            <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
              <label className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Mobile Number (Login ID)</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">+91</span>
                <input name="phone" value={form.phone} onChange={handleChange} required maxLength={10}
                  placeholder="98XXXXXXXX"
                  className="w-full bg-transparent outline-none py-1 text-lg font-bold text-indigo-900" />
              </div>
            </div>

            {/* ✨ Naya Field: Password */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Login Password</label>
              <input name="password" type="text" value={form.password} onChange={handleChange} required
                placeholder="Min 6 characters"
                className="w-full bg-transparent outline-none py-1 text-lg font-bold text-slate-900" />
            </div>

            {/* Joining Date */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Joining Date</label>
              <input name="joiningDate" type="date" value={form.joiningDate} onChange={handleChange} required
                className="w-full border-b-2 border-gray-100 focus:border-indigo-500 outline-none py-2 transition-colors" />
            </div>

            {/* Salary */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Monthly Salary (₹)</label>
              <input name="salary" type="number" value={form.salary} onChange={handleChange} required
                placeholder="50000"
                className="w-full border-b-2 border-gray-100 focus:border-indigo-500 outline-none py-2 transition-colors" />
            </div>
          </div>

          {/* Class Teacher Section */}
          {form.role === "Teacher" && (
            <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-100">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isCT" className="w-5 h-5 accent-indigo-600" checked={form.isClassTeacher} onChange={handleCheckbox} />
                <label htmlFor="isCT" className="font-bold text-gray-700 cursor-pointer">Is this a Class Teacher?</label>
              </div>
              {form.isClassTeacher && (
                <select name="classTeacherOf" value={form.classTeacherOf} onChange={handleChange} required
                  className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg outline-none focus:ring-2 ring-indigo-300">
                  <option value="">Select assigned class</option>
                  {classList.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          )}

          {/* Address */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Address</label>
            <textarea name="address" value={form.address} onChange={handleChange} rows="2"
              className="w-full border border-gray-200 rounded-xl p-3 mt-1 focus:ring-2 ring-indigo-200 outline-none text-sm" />
          </div>

          {/* Photo */}
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Profile Photo</label>
              <input type="file" accept="image/*" onChange={handlePhoto} className="w-full text-xs mt-1" />
            </div>
            {(form.photoURL || form.photo) && (
                <img 
                src={form.photo ? URL.createObjectURL(form.photo) : form.photoURL} 
                className="w-14 h-14 rounded-lg object-cover border-2 border-white shadow-sm" 
                alt="preview" 
                />
            )}
          </div>

          <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex justify-center items-center gap-2">
            {loading ? "Saving Details..." : editData ? "Update Staff Profile" : "Confirm & Register"}
          </button>
        </form>
      </div>
    </div>
  );
}