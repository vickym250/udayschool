import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  ArrowLeft, Calendar, Mail, Phone, BookOpen, 
  IndianRupee, Briefcase, User, MapPin 
} from "lucide-react";

export default function TeacherDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        const docSnap = await getDoc(doc(db, "teachers", id));
        if (docSnap.exists()) {
          setTeacher(docSnap.data());
        } else {
          console.log("No such teacher!");
        }
      } catch (error) {
        console.error("Error fetching teacher:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeacher();
  }, [id]);

  if (loading) return <div className="flex justify-center items-center h-screen font-bold text-slate-500">Loading Profile...</div>;
  if (!teacher) return <div className="text-center mt-20 font-bold text-rose-500">Teacher not found!</div>;

  return (
    <div className="container mx-auto p-4 md:p-8 bg-[#F8FAFC] min-h-screen font-sans">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Back to Dashboard
      </button>

      {/* Main Profile Card */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
          
          {/* Top Banner/Header */}
          <div className="bg-indigo-600 p-8 text-white flex flex-col md:flex-row items-center gap-6">
            <div className="w-32 h-32 bg-white rounded-3xl overflow-hidden border-4 border-white/20 shadow-lg">
              {teacher.photoURL ? (
                <img src={teacher.photoURL} alt={teacher.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 text-4xl font-black">
                  {teacher.name?.[0]}
                </div>
              )}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-black mb-1">{teacher.name}</h1>
              <p className="text-indigo-100 font-medium text-lg">{teacher.subject || "Senior Faculty"}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
                <span className="bg-white/20 px-4 py-1 rounded-full text-xs font-bold backdrop-blur-md">
                  ID: {id.slice(0, 8)}
                </span>
                <span className="bg-emerald-500/80 px-4 py-1 rounded-full text-xs font-bold">
                  Active Member
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column: Personal Info */}
            <div className="space-y-6">
              <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4">Personal Details</h3>
              
              <DetailItem icon={<User size={18}/>} label="Full Name" value={teacher.name} />
              <DetailItem icon={<Phone size={18}/>} label="Phone Number" value={teacher.phone || "Not Provided"} />
              <DetailItem icon={<Mail size={18}/>} label="Email Address" value={teacher.email || "Not Provided"} />
              <DetailItem icon={<MapPin size={18}/>} label="Address" value={teacher.address || "New Delhi, India"} />
            </div>

            {/* Right Column: Professional Info */}
            <div className="space-y-6">
              <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4">Professional Info</h3>
              
              <DetailItem 
                icon={<Calendar size={18} className="text-orange-500" />} 
                label="Joining Date" 
                value={teacher.joiningDate || "Not Mentioned"} 
              />
              <DetailItem 
                icon={<BookOpen size={18} className="text-blue-500" />} 
                label="Primary Subject" 
                value={teacher.subject} 
              />
              <DetailItem 
                icon={<IndianRupee size={18} className="text-emerald-500" />} 
                label="Monthly Salary" 
                value={`₹${teacher.salary || 0}`} 
              />
              <DetailItem 
                icon={<Briefcase size={18} className="text-purple-500" />} 
                label="Experience" 
                value={teacher.experience || "N/A"} 
              />
            </div>

          </div>

          {/* Footer Note */}
          <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-between items-center">
            <p className="text-slate-400 text-xs font-medium">
              Last profile update: {new Date().toLocaleDateString()}
            </p>
            <button 
              onClick={() => toast.error("Edit mode coming soon!")}
              className="text-indigo-600 font-bold text-sm hover:underline"
            >
              Edit Information
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable Small Component for Detail Rows
function DetailItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-4">
      <div className="bg-slate-100 p-2.5 rounded-xl text-slate-600">
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">{label}</p>
        <p className="text-slate-800 font-extrabold">{value}</p>
      </div>
    </div>
  );
}