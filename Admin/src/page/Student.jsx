import React, { useState, useEffect } from "react";
import AddStudent from "../component/AddStudent";
import Readmission from "../component/Readmission";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { updateTotalStudents } from "../component/updateTotalStudents";
import AdmissionDetails from "../component/AdmisionForm";

export default function StudentList() {
  let navigator = useNavigate();

  const CURRENT_ACTIVE_SESSION = "2025-26";
  const sessions = ["2024-25", "2025-26", "2026-27"];
  const [session, setSession] = useState("2025-26");
  
  // Dynamic Classes State
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [className, setClassName] = useState("");

  const [open, setOpen] = useState(false);
  const [openRe, setOpenRe] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);

  const [editStudent, setEditStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsToShow, setRowsToShow] = useState(10);

  // 1. Fetch Classes from Database (As per your screenshot field: 'name')
  useEffect(() => {
    const q = query(collection(db, "classes")); 
    const unsubClasses = onSnapshot(q, (snap) => {
      const classList = snap.docs.map(doc => doc.data().name).filter(Boolean);
      // Alphabetical sort (Class 1, Class 10, Class 2 logic handle karne ke liye)
      const sortedClasses = classList.sort((a, b) => 
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );
      setSchoolClasses(sortedClasses);
      if (sortedClasses.length > 0 && !className) {
        setClassName(sortedClasses[0]);
      }
    });
    return () => unsubClasses();
  }, []);

  // 2. Fetch Students
  useEffect(() => {
    if (!className) return;
    setLoading(true);
    const q = query(
      collection(db, "students"), 
      where("session", "==", session), 
      where("className", "==", className), 
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => !s.deletedAt);
      setStudents(list);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [session, className]);

  // 3. Serial Wise Sorting (By Roll Number)
  const filteredStudents = students
    .filter((s) => {
      const matchSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rollNumber?.toString().includes(searchTerm);
      return matchSearch;
    })
    .sort((a, b) => {
      const rollA = parseInt(a.rollNumber) || 0;
      const rollB = parseInt(b.rollNumber) || 0;
      return rollA - rollB; // Chote se bada (1, 2, 3...)
    });

  const displayedStudents = searchTerm 
    ? filteredStudents 
    : filteredStudents.slice(0, rowsToShow);

  const handlePrint = () => {
    const printContent = document.getElementById("printableTable");
    const newWindow = window.open("", "_blank");
    newWindow.document.write(`
      <html>
        <head>
          <title>Student List - ${className}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              .no-print { display: none !important; }
              @page { size: A4 landscape; margin: 10mm; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #000 !important; padding: 4px !important; font-size: 10px; }
            }
          </style>
        </head>
        <body>
          <h2 class="text-center font-bold text-lg mb-2 uppercase">Student List - ${className} (${session})</h2>
          ${printContent.innerHTML}
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    newWindow.document.close();
  };

  const handleReAdmission = (student) => {
    setEditStudent(student);
    setOpenRe(true);
  };

  const handleOpenDetails = (student) => {
    setSelectedStudentForDetails(student);
    setOpenDetails(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Archive student?")) return;
    await updateDoc(doc(db, "students", id), { deletedAt: serverTimestamp() });
    toast.success("Archived");
    await updateTotalStudents();
  };

  return (
    <div className="p-2 md:p-6 bg-slate-50 min-h-screen font-sans">
      <div className={`max-w-[1600px] mx-auto md:scale-[0.97] origin-top transition-transform ${(open || openRe || openDetails) ? "blur-md pointer-events-none" : ""}`}>

        <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">Student List</h2>
          <button 
            onClick={handlePrint}
            className="bg-slate-800 text-white px-4 py-1.5 rounded-md font-bold text-xs md:text-sm hover:bg-black uppercase"
          >
            Print List
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select value={session} onChange={(e) => { setSession(e.target.value); setRowsToShow(10); }} className="border border-slate-300 rounded-md px-2 py-1.5 text-xs md:text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500/20">
            {sessions.map(s => <option key={s}>{s}</option>)}
          </select>
          
          <select value={className} onChange={(e) => { setClassName(e.target.value); setRowsToShow(10); }} className="border border-slate-300 rounded-md px-2 py-1.5 text-xs md:text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500/20">
            {schoolClasses.length > 0 ? (
              schoolClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)
            ) : (
              <option>Loading...</option>
            )}
          </select>

          <div className="flex-grow">
            <input type="text" placeholder="Search by name or roll..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs md:text-sm outline-none shadow-sm focus:border-indigo-500" />
          </div>
          
          <button onClick={() => { setEditStudent(null); setOpen(true); }} className="bg-[#FFC107] text-black px-4 py-1.5 rounded-md font-bold text-xs md:text-sm shadow-sm hover:bg-amber-500 uppercase">
            + Add Student
          </button>
        </div>

        <div id="printableTable" className="border border-slate-200 rounded-xl overflow-x-auto shadow-lg bg-white">
          <table className="w-full text-left min-w-[1100px]">
            <thead className="bg-slate-700 text-white text-[10px] md:text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 w-16">Photo</th>
                <th className="px-3 py-3 text-center w-20">Reg No</th>
                <th className="px-3 py-3 text-center w-16">Roll</th>
                <th className="px-3 py-3">Student Name</th>
                <th className="px-3 py-3">Father Name</th>
                <th className="px-3 py-3">Mother Name</th>
                <th className="px-3 py-3">Aadhar</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Gender</th>
                <th className="px-3 py-3">DOB</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Address</th>
                <th className="px-3 py-3 text-center no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="9" className="text-center py-20 font-bold text-slate-400">Loading Data...</td></tr>
              ) : displayedStudents.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-20 text-slate-400 italic">No students found in this class.</td></tr>
              ) : (
                displayedStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-indigo-50/50 transition-colors group">
                    <td className="px-3 py-1.5 text-center">
                      <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden border border-slate-200 bg-slate-50 mx-auto shadow-sm">
                        {s.photoURL ? <img src={s.photoURL} className="w-full h-full object-cover" alt="" /> : <span className="flex items-center justify-center h-full text-indigo-400 font-bold text-xs">{s.name?.[0]}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[11px] md:text-xs font-bold text-slate-500 text-center">{s.regNo}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="bg-slate-100 text-indigo-700 px-2 py-0.5 rounded text-[11px] md:text-xs font-black">{s.rollNumber}</span>
                    </td>
                    <td className="px-3 py-2 text-[11px] md:text-[12px] font-black text-slate-800 uppercase">{s.name}</td>
                    <td className="px-3 py-2 text-[11px] md:text-xs text-slate-600 font-medium">{s.fatherName}</td>
                    <td className="px-3 py-2 text-[11px] md:text-xs text-slate-600 font-medium">{s.motherName}</td>
                    <td className="px-3 py-2 text-[11px] md:text-xs text-slate-500 font-mono">{s.aadharNumber || "—"}</td>
                    
                    <td className="px-3 py-2 text-[11px] md:text-xs text-slate-500 font-mono">{s.category || "—"}</td>
                    <td className="px-3 py-2 text-[11px] md:text-xs text-slate-500 font-mono">{s.gender || "—"}</td>
                    <td className="px-3 py-2 text-[11px] md:text-xs text-slate-500 font-mono">{s.dob || "—"}</td>
                    <td className="px-3 py-2 text-[11px] md:text-xs text-indigo-600 font-bold">{s.phone || "—"}</td>
                    <td className="px-3 py-2 text-[10px] text-slate-400 leading-tight max-w-[150px] truncate" title={s.address}>{s.address || "—"}</td>
                    <td className="px-3 py-2 no-print">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleOpenDetails(s)} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[9px] font-black hover:bg-slate-200 uppercase">Detail</button>
                        <button onClick={() => navigator(`/feesrec/${s.id}`)} className="bg-indigo-600 text-white px-2 py-1 rounded text-[9px] font-black hover:bg-indigo-700 uppercase">Fee</button>
                        
                        {s.session === CURRENT_ACTIVE_SESSION ? (
                          <button onClick={() => { setEditStudent(s); setOpen(true); }} className="bg-amber-400 text-white px-2 py-1 rounded text-[9px] font-black hover:bg-amber-500 uppercase">Edit</button>
                        ) : (
                          <button onClick={() => handleReAdmission(s)} className="bg-emerald-600 text-white px-2 py-1 rounded text-[9px] font-black hover:bg-emerald-700 uppercase">Re-Admit</button>
                        )}
                        
                        <button onClick={() => handleDelete(s.id)} className="bg-red-500 text-white px-2 py-1 rounded text-[9px] font-black hover:bg-red-600 uppercase">Del</button>
                        <button onClick={() => navigator(`/idcard/${s.id}`)} className="bg-white text-indigo-600 border border-indigo-600 px-2 py-1 rounded text-[9px] font-black hover:bg-indigo-50 uppercase tracking-tighter">ID</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && !searchTerm && filteredStudents.length > rowsToShow && (
          <div className="mt-6 flex justify-center pb-10 no-print">
            <button onClick={() => setRowsToShow(prev => prev + 20)} className="px-8 py-2 bg-indigo-600 text-white text-xs font-black rounded-full hover:bg-indigo-700 transition-all shadow-md uppercase tracking-wider">
              Show More Students
            </button>
          </div>
        )}
      </div>

      {open && <AddStudent close={() => { setOpen(false); setEditStudent(null); }} editData={editStudent} />}
      {openRe && <Readmission close={() => { setOpenRe(false); setEditStudent(null); }} studentData={editStudent} />}
      {openDetails && selectedStudentForDetails && (
        <AdmissionDetails
          studentId={selectedStudentForDetails.id} 
          subjects={selectedStudentForDetails.subjects || []}
          onClose={() => { setOpenDetails(false); setSelectedStudentForDetails(null); }} 
        />
      )}
    </div>
  );
}