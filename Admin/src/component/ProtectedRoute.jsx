import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

const SESSION_LIMIT = 24 * 60 * 60 * 1000; // ⏰ 24 HOURS
const MIN_LOADER_TIME = 800; // ⏳ minimum loader time (ms)

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [allow, setAllow] = useState(false);

  useEffect(() => {
    const startTime = Date.now();

    const unsub = onAuthStateChanged(auth, async (user) => {
      const finish = async (result) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(MIN_LOADER_TIME - elapsed, 0);

        setTimeout(() => {
          setAllow(result);
          setLoading(false);
        }, delay);
      };

      // ❌ Not logged in
      if (!user) {
        await finish(false);
        return;
      }

      const loginTime = localStorage.getItem("loginTime");

      // ❌ Session invalid
      if (!loginTime || Date.now() - loginTime > SESSION_LIMIT) {
        await signOut(auth);
        localStorage.removeItem("loginTime");
        await finish(false);
        return;
      }

      // ✅ Session valid
      await finish(true);
    });

    return () => unsub();
  }, []);

  // 🔄 LOADER (अब दिखेगा)
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-blue-50">
        <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-blue-600 mb-4"></div>
        <p className="text-blue-700 font-semibold">
          Verifying Admin Session...
        </p>
      </div>
    );
  }

  // 🔒 Not allowed
  if (!allow) {
    return <Navigate to="/" replace />;
  }

  // ✅ Allowed
  return children;
};

export default ProtectedRoute;
