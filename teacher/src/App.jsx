import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Components Import (Aapne jo files di hain unke base par)
import LoginScreen from "./page/Login";
import DashboardWeb from "./page/Dashboard";
import AttendanceWeb from "./page/AttendanceScreen";
import FinalResultWeb from "./page/FinalResultPage";


// Ek simple Protected Route logic taaki bina login ke koi dashboard na dekh sake
const ProtectedRoute = ({ children }) => {
  const teacher = localStorage.getItem("teacher"); // Web mein AsyncStorage ki jagah localStorage
  return teacher ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginScreen />} />

        {/* Protected Routes (Sirf Login ke baad chalenge) */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DashboardWeb />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student-attendance" 
          element={
            <ProtectedRoute>
              <AttendanceWeb/>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/final-result" 
          element={
            <ProtectedRoute>
              <FinalResultWeb/>
            </ProtectedRoute>
          } 
        />


        {/* Catch-all Route: Galat URL hone par home par bhej dega */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;