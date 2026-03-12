import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./component/Sidebar";
import Header from "./component/Header";
import Dashboard from "./page/Dashboard";
import StudentList from "./page/Student";
import Attendance from "./page/Attendance";
import HomeworkPage from "./page/HomeworkPage";
import NoticePage from "./page/NoticePage";
import TestPage from "./page/TestAdd";
import TeachersManagementPage from "./page/Teachermanage";
import TeacherAttendance from "./page/TeacherAttendance";
import FinalResultPage from "./page/Result";
import FeesReceipt from "./component/Fess";
import IDCardGenerator from "./page/Idcard";
import StudentProfile from "./page/StudentProfile";
import AbsentStudents from "./page/AbsentStudents";
import MarksSheet from "./component/Anual";

import Login from "./page/Login";

import { useSidebar } from "./component/SidebarContext";
import ProtectedRoute from "./component/ProtectedRoute";
import HelpPage from "./page/HelpLine";
import SchoolStatusGuard from "./component/SchoolStatusGuard";
import AllReport from "./component/AllReport";
import ChangePassword from "./component/ChangePassword";
import ExamTimetable from "./page/ExamTimetable";
import SchoolManager from "./page/SchoolManager";
import TransferCertificate from "./component/TransferCertificate";
import FeeLedgerConfig from "./page/FeesPage";
import MonthlyFeeSetup from "./page/MonthlyFeeSetup";
import FeePlanMaster from "./page/FeePlanMaster";
import FeeReceiptPage from "./page/FeeReceiptPage";
import BusFeeFirebase from "./page/BusFeeFirebase";
import SubjectMappingFirebase from "./page/SubjectMappingFirebase";

import TimetablePage from "./page/TimetablePage";
import TimetableManager from "./page/TimetablePage";
import TeacherBilling from "./page/TeacherBilling";
import TeacherDetails from "./component/TeacherDetails";
import BulkStudentImport from "./page/ExcelStudentImport";
import AutoBell from "./page/AutoBell";
import AdmitCardCenter from "./page/AdmitCardGenerator";



// ... (baki imports same rahenge)
// ... (imports same rahenge)

export default function App() {
  const { isOpen, setIsOpen } = useSidebar(); // Maan ke chal rahe hain ki setIsOpen bhi available hai

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/profile/:id" element={<StudentProfile />} />

        <Route
          path="/*"
          element={
            <SchoolStatusGuard>
              <ProtectedRoute>
                <div className="min-h-screen bg-gray-100 flex overflow-hidden">
                  
                  {/* SIDEBAR - Responsive Logic */}
                  {/* Mobile: Hidden by default, slides in. Desktop: Fixed width or collapsed icons */}
                  <aside 
                    className={`fixed inset-y-0 left-0 z-50 bg-white shadow-xl transition-all duration-300 ease-in-out
                      ${isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"} 
                      md:translate-x-0 md:static md:block ${isOpen ? "md:w-64" : "md:w-20"}`}
                  >
                    <Sidebar />
                  </aside>

                  {/* OVERLAY for Mobile - Sidebar khulne par background blackish ho jaye */}
                  {isOpen && (
                    <div 
                      className="fixed inset-0 bg-black/50 z-40 md:hidden" 
                      onClick={() => setIsOpen(false)} 
                    />
                  )}

                  {/* MAIN CONTENT AREA */}
                  <div className="flex flex-col flex-1 h-screen overflow-y-auto overflow-x-hidden">
                    <Header />

                    <main className="p-4 md:p-8">
                      <Routes>
                        <Route path="/dash" element={<Dashboard />} />
                        <Route path="/student" element={<StudentList />} />
                        <Route path="/attendance" element={<Attendance />} />
                        <Route path="/homework" element={<HomeworkPage />} />
                        <Route path="/notice" element={<NoticePage />} />
                        <Route path="/test" element={<TestPage />} />
                        <Route path="/teacher" element={<TeachersManagementPage />} />
                        <Route path="/teacherattendace" element={<TeacherAttendance />} />
                        <Route path="/result" element={<FinalResultPage />} />
                        <Route path="/fees" element={<FeesReceipt />} />
                        <Route path="/idcard/:studentId?" element={<IDCardGenerator />} />
                        <Route path="/absentstudent" element={<AbsentStudents />} />
                        <Route path="/marksheet/:studentId/:session?" element={<MarksSheet />} />
                        <Route path="/help" element={<HelpPage />} />
                        <Route path="/all-report/:className/:session" element={<AllReport />} />
                        <Route path="/tc/:id" element={<TransferCertificate />} />
                        <Route path="/change-password" element={<ChangePassword/>} />
                        <Route path="/exam-time" element={<ExamTimetable/>} />
                        <Route path="/manage" element={<SchoolManager/>} />
                        <Route path="/feescon" element={<FeeLedgerConfig/>} />
                        <Route path="/feesmaster" element={<FeePlanMaster/>} />
                        <Route path="/busplane" element={<BusFeeFirebase/>} />

                        <Route path="/feessetup" element={<MonthlyFeeSetup/>} />
                        <Route path="/feesrec/:id" element={<FeeReceiptPage/>} />
                        <Route path="/submap" element={<SubjectMappingFirebase/>} />
                        <Route path="/admitcard" element={<AdmitCardCenter/>} />
                        <Route path="/teachertime" element={<TimetableManager/>} />
                        <Route path="/teacherbill/:id" element={<TeacherBilling/>} />
                        <Route path="/teacherdetail/:id?" element={<TeacherDetails/>} />
                        <Route path="/allexcel" element={<BulkStudentImport/>} />
                         <Route path="/autobel" element={<AutoBell/>} />
                         


                        <Route path="*" element={<Navigate to="/dash" replace />} />

                      </Routes>
                    </main>
                  </div>

                </div>
              </ProtectedRoute>
            </SchoolStatusGuard>
          }
        />
      
      </Routes>
    </BrowserRouter>
  );
}







