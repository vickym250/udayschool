import { useSidebar } from "./SidebarContext";
import { FaBars, FaSignOutAlt, FaShieldAlt } from "react-icons/fa"; 
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function Header() {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Kya aap sach mein logout karna chahte hain?");
    if (confirmLogout) {
      try {
        await signOut(auth);
        navigate("/");
      } catch (error) {
        console.error("Logout Error:", error);
      }
    }
  };

  return (
    <div className="w-full bg-white shadow-sm p-3 md:p-4 sticky top-0 z-40 border-b border-slate-100">
      <div className="  container  mx-auto flex justify-between items-center">
        
        {/* LEFT: Sidebar Toggle & App Name */}
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSidebar} 
            className="p-2.5 hover:bg-slate-50 rounded-2xl text-slate-600 transition-all active:scale-90 border border-transparent hover:border-slate-200"
          >
            <FaBars size={18} />
          </button>
          <div>
            <h1 className="text-base md:text-lg font-black text-slate-800 leading-none">EDU ADMIN</h1>
            <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Authorized
            </p>
          </div>
        </div>
        
        {/* RIGHT: Buttons */}
        <div className="flex items-center gap-2 md:gap-3">
          
          {/* Change Password Button */}
          <button 
            onClick={() => navigate("/change-password")}
            className="flex items-center gap-2 bg-slate-50 text-slate-600 px-3 py-2 md:px-5 md:py-2.5 rounded-2xl hover:bg-slate-900 hover:text-white transition-all duration-300 active:scale-95 font-black text-[10px] uppercase tracking-widest"
          >
            <FaShieldAlt size={14} className="text-blue-500" />
            <span className="hidden sm:inline">Security</span>
          </button>

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 md:px-5 md:py-2.5 rounded-2xl hover:bg-red-600 hover:text-white transition-all duration-300 active:scale-95 font-black text-[10px] uppercase tracking-widest"
          >
            <FaSignOutAlt size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>

        </div>
      </div>
    </div>
  );
}