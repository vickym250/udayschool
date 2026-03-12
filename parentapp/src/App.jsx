import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './page/Login';
import Dashboard from './page/Dashboard';
import Attendance from './page/Attendance';
import Homework from './page/Homework';
import Fees from './page/Fees';
import FeesReceipt from './page/FeesReceipt';
import Profile from './page/Profile';
import Marks from './page/Marks';

function App() {
  // 1. State banayein taaki React ko pata chale jab user login ho
  const [user, setUser] = useState(localStorage.getItem("parentId"));

  // 2. Storage check karne ke liye (Optional par achha hai)
  useEffect(() => {
    const id = localStorage.getItem("parentId");
    setUser(id);
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-slate-100 font-sans">
        <Routes>
          {/* 3. "user" state use karein isAuthenticated ki jagah */}
          <Route
            path="/"
            element={user ? <Navigate to="/dashboard" /> : <Login onLoginSuccess={(id) => setUser(id)} />}
          />

          <Route path="/login" element={<Login onLoginSuccess={(id) => setUser(id)} />} />

          <Route
            path="/dashboard"
            element={user ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/attendance/:studentId"
            element={user ? <Attendance /> : <Navigate to="/login" />}
          />
          <Route
            path="/homework/:className"
            element={user ? <Homework /> : <Navigate to="/login" />}
          />
          <Route
            path="/fees"
            element={user ? <Fees /> : <Navigate to="/login" />}
          />


<Route path="/marks" element={user ? <Marks /> : <Navigate to="/login" />} />






<Route 
  path="/profile" 
  element={user ? <Profile /> : <Navigate to="/login" />} 
/>
<Route 
  path="/receipt" 
  element={user ? <FeesReceipt /> : <Navigate to="/login" />} 
/>




          <Route path="*" element={<div className="p-10 text-center font-bold">Page Not Found!</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;