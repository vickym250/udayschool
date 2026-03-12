import React, { useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";






export default function Login() {








  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const loginUser = async () => {
    if (phone.length !== 10) {
      alert("Sahi mobile number dalein");
      return;
    }

    if (password.length < 4) {
      alert("Password dalein");
      return;
    }

    setLoading(true);

    try {
      const q = query(
        collection(db, "parents"),
        where("phone", "==", phone)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        alert("Number register nahi hai");
        setLoading(false);
        return;
      }

      const userData = snap.docs[0].data();

      if (userData.password === password) {
        localStorage.setItem("parentId", snap.docs[0].id);
        window.location.href = "/dashboard";
      } else {
        alert("Password galat hai");
      }

    } catch (error) {
      console.error("Login Error:", error);
      alert("Login me error aaya");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-xl shadow-md w-80">
        <h2 className="text-xl font-bold text-center mb-4">
          Parent Login
        </h2>

        <input
          type="tel"
          placeholder="Mobile Number"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          className="border p-2 w-full mb-3 rounded"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 w-full mb-4 rounded"
        />

        <button
          onClick={loginUser}
          disabled={loading}
          className="bg-blue-600 text-white py-2 w-full rounded"
        >
          {loading ? "Processing..." : "Login"}
        </button>
      </div>
    </div>
  );
}