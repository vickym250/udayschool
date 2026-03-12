import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  where,
  getDocs 
} from "firebase/firestore";
import { useParams } from "react-router-dom";

export default function IDCardGenerator() {
  const { studentId } = useParams();

  const getCurrentSession = () => {
    const now = new Date();
    const currentMonth = now.getMonth(); 
    const currentYear = now.getFullYear();
    
    if (currentMonth >= 3) {
      return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
    } else {
      return `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
    }
  };

  const [className, setClassName] = useState(""); 
  const [classList, setClassList] = useState([]); 
  const [session, setSession] = useState(getCurrentSession()); 
  const [students, setStudents] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [school, setSchool] = useState({
    name: "SUNSHINE ENGLISH MEDIUM SCHOOL",
    address: "गप- महुवा खास, बन्सापुर रोड, नियर सोनोवा-सिद्धार्थनगर",
    contact: "990900106, 6386954163",
    logoUrl: ""
  });

  const getSessionOptions = () => {
    const currentYear = new Date().getFullYear();
    return [
      `${currentYear - 1}-${currentYear.toString().slice(-2)}`,
      `${currentYear}-${(currentYear + 1).toString().slice(-2)}`,
      `${currentYear + 1}-${(currentYear + 2).toString().slice(-2)}`,
    ];
  };

  useEffect(() => {
    const fetchSchool = async () => {
      const docRef = doc(db, "settings", "schoolDetails");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSchool(prev => ({ ...prev, ...docSnap.data() }));
      }
    };
    fetchSchool();
  }, []);

  useEffect(() => {
    const fetchClasses = async () => {
      const q = query(collection(db, "classes"), orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const classesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClassList(classesData);
      if (classesData.length > 0 && !className) {
        setClassName(classesData[0].name);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!className && !studentId) return;

    let q;
    if (studentId) {
      q = query(collection(db, "students"), where("__name__", "==", studentId));
    } else {
      q = query(
        collection(db, "students"),
        where("className", "==", className),
        where("session", "==", session),
        orderBy("rollNumber", "asc")
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => !s.deletedAt);
      setStudents(data);
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => unsub();
  }, [className, session, studentId]);

  const handlePrint = async () => {
    if (students.length === 0) return alert("No students found!");
    
    setIsPrinting(true);
    let printFrame = document.getElementById("printFrame");
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "printFrame";
      printFrame.style.visibility = "hidden";
      printFrame.style.position = "fixed";
      document.body.appendChild(printFrame);
    }

    let cardsHTML = "";
    students.forEach((s) => {
      const qrData = encodeURIComponent(`Student: ${s.name}, ID: ${s.id}`);
      const qrUrl = `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${qrData}&choe=UTF-8`;

      cardsHTML += `
        <div class="id-card">
          <div class="header-curved">
            <div class="logo-wrap">
               <img src="${school.logoUrl || 'https://via.placeholder.com/60'}" class="logo-img" />
            </div>
            <div class="school-name">${school.name}</div>
            <div class="admission-tag">Session ${session}</div>
          </div>

          <div class="card-body">
            <div class="photo-container">
                ${s.photoURL ? `<img src="${s.photoURL}" />` : `<div class="initial-box">${s.name?.charAt(0)}</div>`}
            </div>
            <div class="info-side">
              <div class="info-item"><span class="label">NAME:</span> <span class="val">${s.name?.toUpperCase()}</span></div>
              <div class="info-item"><span class="label">FATHER:</span> <span class="val">${s.fatherName?.toUpperCase() || "---"}</span></div>
              <div class="info-item"><span class="label">CLASS:</span> <span class="val">${s.className}</span></div>
              <div class="info-item"><span class="label">ROLL NO:</span> <span class="val">${s.rollNumber || "---"}</span></div>
              <div class="info-item"><span class="label">D.O.B:</span> <span class="val">${s.dob || "---"}</span></div>
              <div class="info-item"><span class="label">MOB:</span> <span class="val">${s.phone || s.mobile || "---"}</span></div>
            </div>
          </div>

          <div class="footer-wave">
            <div class="footer-flex">
              <div class="footer-text">
                <div class="address">${school.address}</div>
                <div class="contact">📞 ${school.contact}</div>
              </div>
             
            </div>
          </div>
        </div>
      `;
    });

    const style = `<style>
        @page { size: A4; margin: 0; }
        body { margin: 0; padding: 10mm 5mm; font-family: 'Segoe UI', Arial, sans-serif; background: #fff; }
        
        .print-wrapper { 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          gap: 12px 8px; 
          justify-items: center; 
        }

        .id-card { 
          width: 64mm; 
          height: 88mm; 
          border: 1px solid #ddd; border-radius: 12px; 
          overflow: hidden; position: relative; 
          background: #fff; box-sizing: border-box; 
          page-break-inside: avoid; -webkit-print-color-adjust: exact;
        }
        
        .header-curved {
          background: linear-gradient(180deg, #ffcc33 0%, #ff9900 100%) !important;
          padding: 10px 5px 30px; text-align: center;
          border-radius: 0 0 50% 50% / 0 0 15% 15%;
          position: relative;
          z-index: 1;
        }

        .logo-wrap {
          background: white; width: 35px; height: 35px; border-radius: 50%;
          margin: 0 auto 4px; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .logo-img { height: 26px; width: 26px; object-fit: contain; }
        .school-name { font-size: 8.5px; font-weight: 900; color: #4a1a1a; text-transform: uppercase; line-height: 1.1; }
        .admission-tag { font-size: 7px; font-weight: bold; color: #5d1a1a; margin-top: 2px; }

        .card-body { 
          padding: 0 10px; 
          margin-top: -22px; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          width: 100%;
          box-sizing: border-box;
          position: relative;
          z-index: 10;
        }
        
        .photo-container { 
          width: 55px; height: 65px; 
          border: 3px solid white; border-radius: 8px; 
          overflow: hidden; background: #fff; 
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .photo-container img { width: 100%; height: 100%; object-fit: cover; }
        .initial-box { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px; background: #f1f5f9; color: #cbd5e1; }

        .info-side { width: 100%; margin-top: 6px; }
        .info-item { 
          margin-bottom: 2px; border-bottom: 0.5px solid #f1f5f9; 
          padding-bottom: 1px; font-size: 8.5px; 
          display: flex; align-items: baseline;
        }
        .label { color: #5d1a1a; width: 42px; font-weight: 800; font-size: 7px; flex-shrink: 0; }
        .val { color: #222; font-weight: 700; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; }

        .footer-wave { 
          position: absolute; bottom: 0; width: 100%; height: 40px; 
          background: #5d1a1a !important; color: white;
          display: flex; align-items: center; z-index: 5;
        }
        .footer-flex { display: flex; width: 100%; padding: 0 8px; align-items: center; justify-content: space-between; }
        .footer-text { flex: 1; }
        .address { font-size: 5.5px; line-height: 1.1; opacity: 0.9; }
        .contact { font-size: 7px; font-weight: bold; color: #ffcc33; margin-top: 1px; }
        
        
    </style>`;

    const pri = printFrame.contentWindow;
    pri.document.open();
    pri.document.write(`<html><head><title>Print ID Cards</title>${style}</head><body><div class="print-wrapper">${cardsHTML}</div></body></html>`);
    pri.document.close();

    const images = pri.document.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
      return new Promise(resolve => {
        if (img.complete) resolve();
        img.onload = resolve;
        img.onerror = resolve; 
      });
    }));

    setTimeout(() => {
        setIsPrinting(false);
        pri.focus();
        pri.print();
    }, 700);
  };

  return (
    <div style={{ padding: "40px 20px", textAlign: "center", background: "#f8fafc", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: "550px", margin: "0 auto", background: "#fff", padding: "30px", borderRadius: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
        <h2 style={{ color: "#5d1a1a", marginBottom: "8px", fontSize: "28px" }}>Sunshine ID Portal</h2>
        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "30px" }}>9-Card A4 Print Layout with QR</p>

        {!studentId && (
          <div style={{ display: "flex", gap: "15px", marginBottom: "25px" }}>
            <div style={{ flex: 1, textAlign: "left" }}>
              <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", marginLeft: "5px" }}>Session</label>
              <select 
                value={session} 
                onChange={(e) => setSession(e.target.value)}
                style={{ padding: "14px", width: "100%", borderRadius: "12px", border: "1px solid #e2e8f0", marginTop: "6px", background: "#f8fafc", outline: "none", fontSize: "15px" }}
              >
                {getSessionOptions().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ flex: 1, textAlign: "left" }}>
              <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", marginLeft: "5px" }}>Class</label>
              <select 
                value={className} 
                onChange={(e) => setClassName(e.target.value)}
                style={{ padding: "14px", width: "100%", borderRadius: "12px", border: "1px solid #e2e8f0", marginTop: "6px", background: "#f8fafc", outline: "none", fontSize: "15px" }}
              >
                {classList.length > 0 ? (
                  classList.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))
                ) : (
                  <option>Loading Classes...</option>
                )}
              </select>
            </div>
          </div>
        )}

        <button 
          onClick={handlePrint}
          disabled={isPrinting || students.length === 0}
          style={{ 
            padding: "18px", width: "100%", borderRadius: "14px", border: "none",
            background: isPrinting ? "#94a3b8" : (students.length === 0 ? "#cbd5e1" : "#5d1a1a"), 
            color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "16px",
            transition: "all 0.2s ease",
            boxShadow: students.length > 0 ? "0 10px 15px -3px rgba(93, 26, 26, 0.3)" : "none"
          }}
        >
          {isPrinting ? "⏳ PREPARING PRINT..." : `GENERATE ${students.length} CARDS`}
        </button>

        <div style={{ marginTop: "25px", padding: "12px", background: "#f1f5f9", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Ready for: <b>{className || "Selecting..."}</b> • Session: <b>{session}</b>
          </p>
        </div>
      </div>

      <div style={{ marginTop: "40px", color: "#94a3b8", fontSize: "13px" }}>
        <p>Tip: For 9 cards, set <b>Margins: None</b> and <b>Layout: Portrait</b> in Print Settings.</p>
        <p>© {new Date().getFullYear()} {school.name}</p>
      </div>
    </div>
  );
}