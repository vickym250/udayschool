import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // 🔒 Already logged-in check (Session Persistence logic)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && localStorage.getItem("loginTime")) {
        navigate("/dash", { replace: true });
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 🔐 Persistence set karna takki tab band hone par bhi login rahe
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);

      // ⏱️ Login time save karna important hai redirects ke liye
      localStorage.setItem("loginTime", Date.now());

      navigate("/dash", { replace: true });
    } catch (err) {
      // Error handling as per Firebase codes
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential")
        setError("Invalid email or password!");
      else if (err.code === "auth/invalid-email")
        setError("Invalid email format!");
      else setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] relative overflow-hidden font-sans p-4">
      
      {/* Background Decorative Glows (Screenshot matching) */}
      <div className="absolute top-[-10%] left-[-5%] w-72 md:w-96 h-72 md:h-96 bg-blue-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-72 md:w-96 h-72 md:h-96 bg-indigo-600/10 rounded-full blur-[120px]"></div>

      {/* Main Glassmorphism Card */}
      <div className="bg-[#1a2235]/60 backdrop-blur-xl w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/5 z-10 overflow-hidden transition-all duration-300">
        
        {/* Header Section */}
        <div className="pt-8 md:pt-8 text-center">
          {/* Rotated Logo Box */}
          {/* Logo & School Name Section */}
<div className="text-center mb-10">
  {/* The Icon/Logo Box */}
  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[1.5rem] rotate-12 mb-6 shadow-2xl shadow-indigo-500/40 border border-white/10 transition-transform hover:rotate-0 duration-300">
    <span className="text-4xl -rotate-12 font-black text-white drop-shadow-md">B</span>
  </div>

  {/* School Name with Gradient Typography */}
  <div className="space-y-1">
    <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
     Edu-Tech
    </h1>
    <h2 className="text-lg md:text-xl font-bold text-indigo-400 tracking-[0.2em] uppercase">
     Company Vtech250 
    </h2>
  </div>
  <p className="text-slate-500 mt-4 text-sm font-medium">Enter admin credentials to continue</p>
</div>
    
        </div>

        {/* Form Section */}
        <form onSubmit={handleLogin} className="px-8 md:px-10 pb-10 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-center font-bold animate-pulse">
              ⚠️ {error}
            </div>
          )}

          <div className="space-y-2">
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-white/5 bg-[#0f172a]/50 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
            />

            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-white/5 bg-[#0f172a]/50 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-xl shadow-indigo-600/20 transition-all active:scale-95 mt-2 ${
              loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Signing In...</span>
              </div>
            ) : "Sign In"}
          </button>
        </form>

        {/* Footer Text */}
        <div className="pb-8 text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
            Managed by School Admin Panel v2.0
          </p>
        </div>
      </div>
    </div>
  );
}