import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { 
  User, 
  IdCard, 
  Phone, 
  MapPin, 
  Calendar, 
  LogOut, 
  ChevronLeft,
  ShieldCheck
} from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔐 Change Password States
  const [showPasswordBox, setShowPasswordBox] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  useEffect(() => {
    const savedStudentRaw = localStorage.getItem("student");

    if (!savedStudentRaw || savedStudentRaw === "undefined") {
      setLoading(false);
      return;
    }

    try {
      const studentObj = JSON.parse(savedStudentRaw);
      const studentId = studentObj?.id;

      if (!studentId) {
        setLoading(false);
        return;
      }

      const unsubscribe = onSnapshot(
        doc(db, "students", studentId),
        (snap) => {
          if (snap.exists()) {
            setStudentData({ id: snap.id, ...snap.data() });
          }
          setLoading(false);
        },
        (err) => {
          console.log("Profile Error:", err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Error parsing student data:", error);
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    if (window.confirm("Kya aap Logout karna chahte hain?")) {
      try {
        await signOut(auth);
        localStorage.clear();
        window.location.href = "/login";
      } catch (e) {
        alert("Logout fail hua!");
      }
    }
  };

  // 🔐 Change Password Logic
  const handleChangePassword = async () => {
    const parentId = localStorage.getItem("parentId");

    if (!parentId) {
      alert("Parent not logged in");
      return;
    }

    if (!currentPass || !newPass || !confirmPass) {
      alert("Sab field bharein");
      return;
    }

    if (newPass !== confirmPass) {
      alert("New password match nahi kar raha");
      return;
    }

    try {
      const q = query(
        collection(db, "parents"),
        where("__name__", "==", parentId)
      );

      const snap = await getDocs(q);

      if (!snap.empty) {
        const parentData = snap.docs[0].data();

        if (parentData.password !== currentPass) {
          alert("Current password galat hai");
          return;
        }

        await updateDoc(doc(db, "parents", parentId), {
          password: newPass
        });

        alert("Password successfully change ho gaya!");

        setCurrentPass("");
        setNewPass("");
        setConfirmPass("");
        setShowPasswordBox(false);
      }
    } catch (error) {
      console.log(error);
      alert("Error changing password");
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center font-bold text-blue-600">
        Loading Profile...
      </div>
    );

  if (!studentData)
    return (
      <div className="flex flex-col h-screen items-center justify-center p-10 text-center">
        <p className="text-slate-400 mb-4 font-bold">
          Student data not found.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-blue-600 font-black uppercase text-xs border-b-2 border-blue-600"
        >
          Go to Dashboard
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center shadow-sm sticky top-0 z-20">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-full mr-2"
        >
          <ChevronLeft size={24} className="text-blue-900" />
        </button>
        <h1 className="text-xl font-black text-blue-900 tracking-tight">
          My Profile
        </h1>
      </div>

      <div className="max-w-md mx-auto p-4">
        {/* Avatar Section */}
        <div className="flex flex-col items-center mt-6 mb-10">
          <div className="relative">
            <img
              src={
                studentData.photoURL ||
                "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              }
              className="w-32 h-32 rounded-[40px] border-4 border-white shadow-xl object-cover"
              alt="Avatar"
            />
            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-2xl border-4 border-slate-50 shadow-lg">
              <ShieldCheck size={20} />
            </div>
          </div>
          <h2 className="text-2xl font-black text-blue-900 mt-4">
            {studentData.name}
          </h2>
          <span className="bg-blue-100 text-blue-600 px-4 py-1 rounded-full text-[10px] font-black uppercase mt-1">
            Class {studentData.className}
          </span>
        </div>

        {/* Info Cards */}
        <div className="bg-white rounded-[32px] p-2 shadow-sm border border-slate-100 space-y-1">
          <InfoItem icon={<IdCard size={20} />} label="Roll Number" value={studentData.rollNumber} />
          <InfoItem icon={<Phone size={20} />} label="Phone Number" value={studentData.phone} />
          <InfoItem icon={<MapPin size={20} />} label="Address" value={studentData.address} />
          <InfoItem icon={<Calendar size={20} />} label="Session" value={studentData.session || "2025-26"} />
        </div>

        {/* 🔐 Change Password */}
        <button
          onClick={() => setShowPasswordBox(!showPasswordBox)}
          className="w-full mt-6 bg-blue-50 text-blue-600 py-4 rounded-[24px] font-black border border-blue-100"
        >
          Change Password
        </button>

        {showPasswordBox && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border mt-4 space-y-3">
            <input
              type="password"
              placeholder="Current Password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              className="w-full border p-3 rounded-xl"
            />
            <input
              type="password"
              placeholder="New Password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full border p-3 rounded-xl"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full border p-3 rounded-xl"
            />
            <button
              onClick={handleChangePassword}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold"
            >
              Update Password
            </button>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full mt-8 bg-red-50 text-red-600 py-5 rounded-[24px] font-black flex items-center justify-center gap-3 active:scale-95 transition-all border border-red-100"
        >
          <LogOut size={20} /> Logout Account
        </button>

        <p className="text-center mt-10 text-[10px] text-slate-300 font-bold uppercase tracking-[0.4em]">
          Sunshine App v2.0.1 Web
        </p>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-center p-4 hover:bg-slate-50 rounded-2xl transition-colors">
      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mr-4">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="font-bold text-slate-800">{value || "Not Set"}</p>
      </div>
    </div>
  );
}