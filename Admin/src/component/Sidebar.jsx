import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useSidebar } from "./SidebarContext";

// Icons
import { 
  HiOutlineViewGrid, 
  HiOutlineUserGroup, 
  HiOutlineUserCircle,
  HiOutlineBookOpen,
  HiOutlineSpeakerphone,
  HiOutlineQuestionMarkCircle,
  HiChevronDown,
  HiOutlineAcademicCap,
  HiOutlineBadgeCheck,
  HiX,
  HiOutlineCog,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineBell
} from "react-icons/hi"; 

const Sidebar = () => {
  const { isOpen, setIsOpen } = useSidebar();
  const [openSubMenu, setOpenSubMenu] = useState(null);

  const toggleSubMenu = (menuName) => {
    if (openSubMenu === menuName) {
      setOpenSubMenu(null);
    } else {
      setOpenSubMenu(menuName);
      if (!isOpen) setIsOpen(true);
    }
  };

  const menuItems = [
    { path: "/dash", name: "Dashboard", icon: <HiOutlineViewGrid /> },
    { 
      name: "Students", 
      icon: <HiOutlineUserGroup />,
      subMenu: [
        { path: "/student", name: "Student Data" },
        { path: "/attendance", name: "Attendance" },
        { path: "/absentstudent", name: "Absent List" },
        { path: "/idcard", name: "IdCard" },
        { path: "/exam-time", name: "Exam-Time" },
      ]
    },
    { 
      name: "Fees Master", 
      icon:<HiOutlineCurrencyDollar />,
      subMenu: [
        { path: "/feescon", name: "Setup" },
        { path: "/feessetup", name: "Mothaly Fees Setup" },
        { path: "/feesmaster", name: "Set class Fees" },
        { path: "/busplane", name: "Location Bus " },
      ]
    },
    { 
      name: "Admit Card Master", 
      icon:<HiOutlineDocumentText />,
      subMenu: [
        { path: "/submap", name: "Set Subject" },
        { path: "/exam-time", name: "Exam-Timetable " },
        { path: "/admitcard", name: "Admit- Card " },
      ]
    },
    { 
      name: "Teachers", 
      icon: <HiOutlineUserCircle />,
      subMenu: [
        { path: "/teacher", name: "Teacher Profiles" },
        { path: "/teacherattendace", name: "Teacher Attendance" },
        { path: "/teachertime", name: "Teacher Time" },
      ]
    },
    { path: "/homework", name: "Homework", icon: <HiOutlineBookOpen /> },
    { path: "/notice", name: "Notices", icon: <HiOutlineSpeakerphone /> },
    { path: "/result", name: "Exam Results", icon: <HiOutlineBadgeCheck /> },
    { path: "/help", name: "Support Help", icon: <HiOutlineQuestionMarkCircle /> },
    { path: "/manage", name: "Settings", icon: <HiOutlineCog/> },
    { path: "/autobel", name: "AutoBell", icon: <HiOutlineBell /> },
  ];

  return (
    <>
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      />

      <div
        className={`
          fixed top-0 left-0 h-screen bg-[#0f172a] text-slate-300 z-50 
          transition-all duration-300 ease-in-out border-r border-slate-800
          ${isOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full md:translate-x-0 md:w-20"}
          overflow-y-auto overflow-x-hidden scrollbar-hide
        `}
      >
        <div className="flex items-center justify-between px-5 border-b border-slate-800 h-16 bg-[#1e293b]/50 sticky top-0 z-10">
          <div className={`flex items-center gap-3 transition-all duration-300 ${!isOpen && "md:justify-center w-full"}`}>
            <div className="bg-blue-600 p-1.5 rounded-lg text-white shrink-0">
              <HiOutlineAcademicCap className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className={`font-bold text-white tracking-wide text-lg whitespace-nowrap ${!isOpen && "hidden"}`}>
              EduAdmin
            </span>
          </div>

          {isOpen && (
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
            >
              <HiX size={24} />
            </button>
          )}
        </div>

        {/* 📂 Menu Items - Added lg:space-y-1 to shrink vertical gap on laptops */}
        <ul className="p-4 space-y-2 lg:p-3 lg:space-y-1">
          {menuItems.map((item, index) => (
            <li key={index}>
              {item.subMenu ? (
                <div>
                  <button
                    onClick={() => toggleSubMenu(item.name)}
                    className={`flex items-center justify-between w-full p-3 lg:p-2 rounded-xl transition-all duration-200 
                    ${openSubMenu === item.name ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white"}`}
                  >
                    <div className="flex items-center gap-4 lg:gap-3">
                      {/* Icons smaller on laptop (lg:text-xl) */}
                      <span className="text-2xl lg:text-xl shrink-0">{item.icon}</span>
                      <span className={`font-medium lg:text-sm transition-opacity duration-200 ${!isOpen && "hidden"}`}>
                        {item.name}
                      </span>
                    </div>
                    {isOpen && (
                      <HiChevronDown
                        className={`transition-transform duration-300 ${openSubMenu === item.name ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      openSubMenu === item.name && isOpen ? "max-h-60 mt-1" : "max-h-0"
                    }`}
                  >
                    <ul className="pl-10 lg:pl-8 space-y-1 relative before:absolute before:left-5 lg:before:left-4 before:top-0 before:h-full before:w-[1px] before:bg-slate-700">
                      {item.subMenu.map((sub) => (
                        <li key={sub.path}>
                          <NavLink
                            to={sub.path}
                            onClick={() => window.innerWidth < 768 && setIsOpen(false)}
                            className={({ isActive }) =>
                              `block p-2 lg:p-1.5 text-[13px] lg:text-[12px] rounded-lg transition-all ${
                                isActive ? "text-blue-400 font-bold" : "text-slate-400 hover:text-slate-100"
                              }`
                            }
                          >
                            {sub.name}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <NavLink
                  to={item.path}
                  onClick={() => window.innerWidth < 768 && setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-4 lg:gap-3 p-3 lg:p-2 rounded-xl transition-all duration-200
                    ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "hover:bg-slate-800/50 hover:text-white"}`
                  }
                >
                  <span className="text-2xl lg:text-xl shrink-0">{item.icon}</span>
                  <span className={`font-medium lg:text-sm ${!isOpen && "hidden"}`}>
                    {item.name}
                  </span>
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default Sidebar;