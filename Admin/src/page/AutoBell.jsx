import React, { useEffect, useState, useRef } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

export default function AutoBell() {
  const [periods, setPeriods] = useState([]);
  const [lastPlayed, setLastPlayed] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [isSystemActive, setIsSystemActive] = useState(false);
  const [debugMsg, setDebugMsg] = useState("System Ready");

  // Form State
  const [newBell, setNewBell] = useState({ label: "P1", periodName: "", time: "", type: "class" });
  
  // Audio Ref - Make sure bell.mp3 is in your public folder
  const bellAudio = useRef(new Audio("/bell.mp3"));

  // 🔹 Time format ko saaf karne ke liye (taaki matching mein galti na ho)
  const cleanTime = (t) => {
    if (!t) return "";
    return t.replace(/\s+/g, '').replace(/^0/, '').toLowerCase();
  };

  // 🔹 Fetch Data from Firestore
  const fetchPeriods = async () => {
    try {
      const snapshot = await getDocs(collection(db, "timetablePeriods"));
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPeriods(list); 
      setDebugMsg("Database Synced ✅");
    } catch (error) { 
      setDebugMsg("Database Error: " + error.message);
    }
  };

  // 🔹 Add New Bell
  const handleAddBell = async (e) => {
    e.preventDefault();
    if (!newBell.time) return alert("Bhai, Time likhna zaruri hai!");
    try {
      await addDoc(collection(db, "timetablePeriods"), newBell);
      setNewBell({ label: "P1", periodName: "", time: "", type: "class" });
      fetchPeriods();
    } catch (error) { 
      console.error("Error adding document: ", error); 
    }
  };

  // 🔹 Delete Bell
  const handleDelete = async (id) => {
    if (window.confirm("Kya is bell ko delete kar dein?")) {
      await deleteDoc(doc(db, "timetablePeriods", id));
      fetchPeriods();
    }
  };

  // 🔹 Bell Settings (P0, Break, Off, Prayer)
  const getBellSettings = (period, index) => {
    const type = period.type?.toLowerCase();
    const label = period.label?.toUpperCase() || "";
    const prevPeriod = index > 0 ? periods[index - 1] : null;

    // 🔥 P0 SPECIAL: 10 times fast + Assembly Message
    if (label === "P0") {
      return { count: 10, speed: 600, msg: "Assembly" };
    }

    // Number of bells based on label (P1=1, P5=5)
    const count = parseInt(label.replace(/\D/g, "")) || 1;

    if (type === "prayer" || type === "assembly") return { count: 3, speed: 3000, msg: "Morning Assembly" };
    if (type === "off") return { count: count, speed: 600, msg: "School is over" };
    if (type === "break") return { count: count, speed: 700, msg: "Lunch Break" };
    
    // Break ke baad wali pehli class (Fast Bell)
    if (prevPeriod?.type === "break") return { count: count, speed: 700, msg: "Class after break" };
    
    // Normal Class
    return { count: count, speed: 1500, msg: period.periodName || label };
  };

  // 🔹 Play Bell Sequence
  const playBellSequence = async (settings) => {
    for (let i = 0; i < settings.count; i++) {
      try {
        bellAudio.current.currentTime = 0;
        await bellAudio.current.play();
        await new Promise((res) => setTimeout(res, settings.speed));
      } catch (err) { 
        setDebugMsg("Audio Blocked! Click START SYSTEM button");
      }
    }
    // Voice Announcement
    const speech = new SpeechSynthesisUtterance(`Attention please. It's time for ${settings.msg}`);
    speech.lang = "en-IN";
    window.speechSynthesis.speak(speech);
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  // 🔹 Live Clock Timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().toLocaleTimeString("en-US", { 
        hour: "numeric", 
        minute: "2-digit", 
        hour12: true 
      });
      setCurrentTime(now);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 🔹 MAIN AUTO-CHECKER
  useEffect(() => {
    const interval = setInterval(() => {
      if (isSystemActive) {
        // DB time aur clock time ko "clean" karke match kar rahe hain
        const matchingPeriod = periods.find((p) => cleanTime(p.time) === cleanTime(currentTime));
        
        if (matchingPeriod && lastPlayed !== currentTime) {
          setLastPlayed(currentTime); // Lock taaki usi minute mein dubara na baje
          const idx = periods.indexOf(matchingPeriod);
          const settings = getBellSettings(matchingPeriod, idx);
          playBellSequence(settings);
          setDebugMsg("🔔 Ringing Now: " + (matchingPeriod.periodName || matchingPeriod.label));
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [periods, currentTime, isSystemActive, lastPlayed]);

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>🔔 School Auto Bell Dashboard</h2>

      {/* Debug Monitor */}
      <div style={{ background: '#333', color: '#0f0', padding: '8px 15px', borderRadius: 5, fontSize: '12px', marginBottom: 15, fontFamily: 'monospace' }}>
        Status: {debugMsg} | Current Clock: {currentTime}
      </div>

      {/* Add Bell Form */}
      <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 20, border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h4 style={{ marginTop: 0 }}>➕ Add New Period</h4>
        <form onSubmit={handleAddBell} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input placeholder="Label (P0, P1)" value={newBell.label} onChange={e => setNewBell({...newBell, label: e.target.value})} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
          <input placeholder="Name (Maths)" value={newBell.periodName} onChange={e => setNewBell({...newBell, periodName: e.target.value})} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
          <input placeholder="Time (8:00 AM)" value={newBell.time} onChange={e => setNewBell({...newBell, time: e.target.value})} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
          <select value={newBell.type} onChange={e => setNewBell({...newBell, type: e.target.value})} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
            <option value="class">Class</option>
            <option value="prayer">Prayer</option>
            <option value="break">Break</option>
            <option value="off">Off</option>
          </select>
          <button type="submit" style={{ padding: '8px 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Add Bell</button>
        </form>
      </div>

      {/* Live Display */}
      <div style={{ textAlign: 'center', marginBottom: 30, padding: 20, background: '#fff', borderRadius: 10, border: '1px solid #eee' }}>
        <h1 style={{ fontSize: '4rem', margin: 0, color: '#222' }}>{currentTime}</h1>
        <div style={{ marginTop: 10 }}>
          <button 
            onClick={() => setIsSystemActive(!isSystemActive)} 
            style={{ 
              padding: '15px 40px', 
              fontSize: '20px', 
              background: isSystemActive ? '#dc3545' : '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8, 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isSystemActive ? "🛑 STOP AUTO SYSTEM" : "▶️ START AUTO SYSTEM"}
          </button>
          <p style={{ marginTop: 10, color: isSystemActive ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
            {isSystemActive ? "System is watching the clock..." : "System is idle. Click START to begin."}
          </p>
        </div>
      </div>

      {/* Timetable Table */}
      <table border="1" cellPadding="12" style={{ width: "100%", borderCollapse: 'collapse', background: '#fff' }}>
        <thead style={{ background: '#333', color: 'white' }}>
          <tr>
            <th>Label (Bells)</th>
            <th>Name</th>
            <th>Time</th>
            <th>Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((p, index) => (
            <tr key={p.id} style={{ 
              textAlign: 'center', 
              backgroundColor: cleanTime(currentTime) === cleanTime(p.time) ? '#fff3cd' : 'transparent',
              borderBottom: '1px solid #eee'
            }}>
              <td style={{ fontWeight: 'bold' }}>{p.label}</td>
              <td>{p.periodName}</td>
              <td style={{ color: '#007bff', fontWeight: 'bold' }}>{p.time}</td>
              <td style={{ textTransform: 'capitalize' }}>{p.type}</td>
              <td>
                <button onClick={() => playBellSequence(getBellSettings(p, index))} style={{ cursor: 'pointer', padding: '5px 10px', marginRight: 5 }}>🔔 Test</button>
                <button onClick={() => handleDelete(p.id)} style={{ color: '#dc3545', cursor: 'pointer', padding: '5px 10px', background: 'none', border: '1px solid #dc3545', borderRadius: 4 }}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}