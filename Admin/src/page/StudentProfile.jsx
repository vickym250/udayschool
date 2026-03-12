import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function StudentProfile() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState({
    name: "Bright Future School",
    logoUrl: "",
    address: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const schoolSnap = await getDoc(doc(db, "settings", "schoolDetails"));
        if (schoolSnap.exists()) setSchool(schoolSnap.data());

        const studentSnap = await getDoc(doc(db, "students", id));
        if (studentSnap.exists()) setStudent(studentSnap.data());
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 font-black text-blue-900 animate-pulse uppercase tracking-widest">Loading Profile...</p>
    </div>
  );

  if (!student) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-red-50 text-red-600 px-6 py-3 rounded-lg font-bold shadow-sm">Student Not Found!</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-64 bg-blue-900 rounded-b-[50px] z-0 shadow-lg"></div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-white/20">
        
        {/* Header Section */}
        <div className="pt-8 pb-6 px-6 text-center border-b border-dashed border-slate-200">
          {school.logoUrl && (
            <img src={school.logoUrl} alt="Logo" className="h-12 mx-auto mb-3 object-contain" />
          )}
          <h2 className="text-lg font-black text-blue-900 uppercase leading-tight">{school.name}</h2>
          <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <span>Verified Profile</span>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          </div>
        </div>

        {/* Hero Section */}
        <div className="p-6 text-center">
          <div className="w-28 h-28 mx-auto mb-4 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100">
            {student.photoURL ? (
              <img src={student.photoURL} alt="Student" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-900 text-white text-4xl font-bold">
                {student.name?.charAt(0)}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{student.name}</h1>
          <p className="text-blue-600 font-bold text-sm mt-1">{student.className}</p>
        </div>

        {/* Two Column Grid */}
        <div className="px-6 pb-6 grid grid-cols-2 gap-3">
          
          <div className="col-span-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Roll Number</p>
            <p className="text-sm font-bold text-slate-700">{student.rollNumber}</p>
          </div>

          <div className="col-span-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Session</p>
            <p className="text-sm font-bold text-slate-700">{student.session || "2024-25"}</p>
          </div>

          <div className="col-span-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Father's Name</p>
            <p className="text-sm font-bold text-slate-700 uppercase">{student.fatherName}</p>
          </div>

          <div className="col-span-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Date of Birth</p>
            <p className="text-sm font-bold text-slate-700">{student.dob}</p>
          </div>

          

          <div className="col-span-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Contact No.</p>
              <p className="text-sm font-bold text-slate-700">{student.phone || "N/A"}</p>
            </div>
            <a href={`tel:${student.phone}`} className="p-2 bg-blue-100 text-blue-600 rounded-full">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
            </a>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 text-center border-t border-slate-100">
          <div className="flex justify-center gap-1 mb-3 opacity-20">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="w-[2px] h-6 bg-black"></div>
            ))}
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Digital Identity Card</p>
          <p className="text-[9px] text-slate-300 mt-2">© {new Date().getFullYear()} {school.name}</p>
        </div>
      </div>
    </div>
  );
}