import React, { useState } from "react";
import { auth } from "../firebase";
import { updatePassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { HiLockClosed, HiArrowLeft } from "react-icons/hi";

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();

    // Validations
    if (newPassword !== confirmPassword) {
      return alert("Dono password match nahi ho rahe hain!");
    }
    if (newPassword.length < 6) {
      return alert("Password kam se kam 6 character ka hona chahiye!");
    }

    setLoading(true);
    const user = auth.currentUser;

    if (user) {
      try {
        await updatePassword(user, newPassword);
        alert("Password successfully update ho gaya! Ab aap login page par jayenge.");
        // Password change ke baad security ke liye logout kar dena behtar hai
        await auth.signOut();
        navigate("/");
      } catch (error) {
        console.error(error);
        if (error.code === "auth/requires-recent-login") {
          alert("Security Error: Kripya logout karke fir se login karein, uske baad hi password change hoga.");
        } else {
          alert("Password update nahi ho paya. Error: " + error.message);
        }
      }
    } else {
      alert("Koi user logged in nahi mila.");
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 border border-slate-100 relative">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-8 left-8 text-slate-400 hover:text-slate-900 transition-colors"
        >
           <HiArrowLeft size={24}/>
        </button>
        
        <div className="text-center mb-10 mt-4">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-100">
            <HiLockClosed size={36}/>
          </div>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">Security</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Update Admin Password</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">New Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white px-6 py-4 rounded-2xl outline-none transition-all font-bold text-slate-700"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Confirm Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white px-6 py-4 rounded-2xl outline-none transition-all font-bold text-slate-700"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-blue-600 shadow-2xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 mt-4"
          >
            {loading ? "Updating..." : "Confirm Update"}
          </button>
        </form>

        <p className="text-center text-[9px] text-slate-300 font-bold uppercase mt-8 tracking-widest">
          End-to-End Encrypted Security
        </p>
      </div>
    </div>
  );
}