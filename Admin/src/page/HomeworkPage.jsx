import React, { useEffect, useState } from "react";
import { db, storage } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  Plus, 
  Trash2, 
  FileText, 
  Clock, 
  BookOpen, 
  Filter, 
  X, 
  Paperclip,
  Loader2,
  Calendar
} from "lucide-react";
import toast from "react-hot-toast";

export default function HomeworkPage() {
  const [className, setClassName] = useState("Class 1");
  const [homeworkList, setHomeworkList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    subject: "Maths",
    visibleDays: "1",
    file: null
  });

  // Current Session nikalne ka logic
  const getSession = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 4 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
  };
  const currentSession = getSession();

  // --- 🟢 FIRESTORE 'WHERE' QUERY LOGIC ---
  useEffect(() => {
    setLoading(true);
    // Query: Sirf wahi data lao jo deleted nahi hai, is class ka hai, aur is session ka hai
    const q = query(
      collection(db, "homework"),
      where("className", "==", className),
      where("session", "==", currentSession),
      where("deletedAt", "==", null),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setHomeworkList(data);
      setLoading(false);
    }, (error) => {
      console.error("Query Error:", error);
      toast.error("Database error! Index shayad create nahi hai.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [className, currentSession]); // Jab class badlegi, query dubara chalegi

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) return toast.error("Bhai, Title aur Description toh bharo!");

    setIsUploading(true);
    const toastId = toast.loading("Uploading homework...");

    let fileURL = "";
    try {
      if (form.file) {
        const fileRef = ref(storage, `homework/${Date.now()}_${form.file.name}`);
        await uploadBytes(fileRef, form.file);
        fileURL = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, "homework"), {
        className,
        session: currentSession,
        title: form.title,
        subject: form.subject,
        description: form.description,
        visibleDays: Number(form.visibleDays),
        fileURL,
        deletedAt: null, // Default null taki query me dikhe
        createdAt: serverTimestamp()
      });

      toast.success("Homework Post Ho Gaya!", { id: toastId });
      setOpen(false);
      setForm({ title: "", description: "", subject: "Maths", visibleDays: "1", file: null });
    } catch (err) {
      console.error(err);
      toast.error("Upload fail ho gaya!", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-slate-800">Bhai, isey delete (archive) kar dein?</p>
        <div className="flex gap-2 justify-end">
          <button className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold" onClick={() => toast.dismiss(t.id)}>NAHI</button>
          <button className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold" onClick={async () => {
            await updateDoc(doc(db, "homework", id), { deletedAt: new Date() });
            toast.dismiss(t.id);
            toast.success("Archived!");
          }}>HAAN, KAR DO</button>
        </div>
      </div>
    ));
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Homework Admin</h1>
            <div className="flex items-center gap-2 text-slate-500 mt-1 font-bold text-sm">
              <Calendar size={14} className="text-blue-500" />
              <span>Session: {currentSession}</span>
            </div>
          </div>
          <button 
            onClick={() => setOpen(true)} 
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={20} strokeWidth={3} />
            CREATE HOMEWORK
          </button>
        </div>

        {/* Filter Section */}
        <div className="mb-8 flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-200 w-fit">
          <div className="flex items-center gap-2 px-3 border-r">
            <Filter size={16} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase">Class Filter</span>
          </div>
          <select 
            value={className} 
            onChange={(e) => setClassName(e.target.value)} 
            className="bg-transparent pr-8 pl-2 py-1 rounded-lg font-black text-slate-800 outline-none cursor-pointer"
          >
            {[...Array(12)].map((_, i) => <option key={i}>Class {i + 1}</option>)}
          </select>
        </div>

        {/* Grid List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="animate-spin text-blue-500 mb-2" size={40} />
            <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">Fetching Data...</p>
          </div>
        ) : homeworkList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {homeworkList.map((h) => (
              <div key={h.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all relative group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                    <BookOpen size={12} /> {h.subject}
                  </div>
                  <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                    <Clock size={12} /> {h.visibleDays} Days
                  </div>
                </div>
                
                <h3 className="font-black text-slate-800 text-lg leading-tight mb-2 uppercase group-hover:text-blue-600 transition-colors">
                  {h.title}
                </h3>
                
                <p className="text-slate-500 text-sm mb-6 line-clamp-3 font-medium">
                  {h.description}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <button onClick={() => handleDelete(h.id)} className="text-red-400 hover:text-red-600 font-black text-[10px] flex items-center gap-1 transition-colors uppercase">
                    <Trash2 size={14} /> Delete
                  </button>
                  
                  {h.fileURL && (
                    <a href={h.fileURL} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-black text-[10px] hover:bg-slate-900 hover:text-white transition-all uppercase">
                      <Paperclip size={14} /> Attachment
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] p-20 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <FileText className="text-slate-200 mb-4" size={60} />
            <h3 className="text-xl font-black text-slate-300 uppercase">Khali Hai Bhai!</h3>
            <p className="text-slate-400 text-sm font-bold">{className} ke liye koi homework nahi mila.</p>
          </div>
        )}
      </div>

      {/* Modern Post Modal */}
      {open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tight uppercase">Post Task</h2>
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-1">Class: {className} | Session: {currentSession}</p>
              </div>
              <button onClick={() => setOpen(false)} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white transition-colors">
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Homework Title</label>
                <input type="text" placeholder="Ex: English Chapter 1 Question/Answer" className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 p-4 rounded-2xl outline-none font-bold text-slate-800 transition-all" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Subject</label>
                  <select className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-black text-slate-800 border-2 border-transparent" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})}>
                    <option>Maths</option><option>Science</option><option>English</option><option>Hindi</option><option>S.St</option><option>Computer</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Show For</label>
                  <select className="w-full bg-orange-50 text-orange-700 p-4 rounded-2xl outline-none font-black border-2 border-transparent" value={form.visibleDays} onChange={(e) => setForm({...form, visibleDays: e.target.value})}>
                    <option value="1">1 Day</option><option value="2">2 Days</option><option value="3">3 Days</option><option value="7">1 Week</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Description / Instructions</label>
                <textarea placeholder="Write complete details here..." className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 p-4 rounded-2xl outline-none min-h-[120px] font-medium text-slate-600 transition-all resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>

              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200 group hover:border-blue-400 transition-colors">
                <Paperclip size={20} className="text-slate-400" />
                <input type="file" className="text-[10px] font-black text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-slate-900 file:text-white cursor-pointer" onChange={(e) => setForm({ ...form, file: e.target.files[0] })} />
              </div>
              
              <button disabled={isUploading} className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:bg-blue-300 uppercase tracking-widest">
                {isUploading ? <Loader2 className="animate-spin" size={20} /> : <><Plus size={20} strokeWidth={4} /> Publish Task</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}