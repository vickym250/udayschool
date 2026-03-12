import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const TransferCertificate = () => {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manualPNR, setManualPNR] = useState("");

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const docRef = doc(db, "students", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStudent(data);
          if (data.pnrNumber) setManualPNR(data.pnrNumber);
        }
      } catch (error) {
        console.error("Error fetching student:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [id]);

  const handlePrint = () => {
    // 1. Content aur Styles taiyaar karein
    const content = document.getElementById('tc-content').innerHTML;

    const printStyles = `
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Pinyon+Script&display=swap');
        
        body { font-family: 'Times New Roman', serif; background: white; margin: 0; padding: 0; }
        
        .outer-border {
          border: 3px solid #1e3a8a;
          padding: 5px;
          margin: 15px;
          height: calc(100vh - 40px);
          box-sizing: border-box;
        }

        .inner-border {
          border: 1px solid #1e3a8a;
          padding: 40px;
          height: 100%;
          position: relative;
          background: #fffef2 !important;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .watermark {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 7rem; color: rgba(30, 58, 138, 0.04);
          font-weight: 900; white-space: nowrap; z-index: 0;
          pointer-events: none;
        }

        .header-title { font-family: 'Cinzel', serif; color: #1e3a8a; }
        .dotted-line { border-bottom: 2px dotted #1e3a8a; flex-grow: 1; margin-left: 10px; }
        
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; }
        }
      </style>
    `;

    const fullHTML = `
      <html>
        <head>
          <title>TC - ${student?.name || 'Student'}</title>
          ${printStyles}
        </head>
        <body>
          <div class="outer-border">
            <div class="inner-border">
              <div class="watermark uppercase">S.D. MODEL SCHOOL</div>
              <div style="position: relative; z-index: 10;">
                ${content}
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 700);
            };
          </script>
        </body>
      </html>
    `;

    // 2. Mobile vs Desktop Logic
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // Mobile ke liye Iframe method (Pop-up block nahi hota)
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(fullHTML);
      doc.close();

      iframe.contentWindow.focus();
      setTimeout(() => {
        iframe.contentWindow.print();
        setTimeout(() => { document.body.removeChild(iframe); }, 2000);
      }, 1500); // Wait for Tailwind to load
    } else {
      // Desktop ke liye naya window method
      const blob = new Blob([fullHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  if (loading) return <div className="p-10 md:p-20 text-center font-bold text-white bg-slate-900 h-screen">Loading Data...</div>;
  if (!student) return <div className="p-10 md:p-20 text-center font-bold text-red-500 bg-slate-900 h-screen">Student Not Found!</div>;

  return (
    <div className="bg-slate-900 min-h-screen py-4 md:py-10 flex flex-col items-center px-4 no-print">
      
      {/* Settings Bar */}
      <div className="w-full max-w-4xl bg-white p-5 md:p-6 rounded-xl shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 border-b-4 border-blue-900">
        <div className="flex flex-col w-full md:w-auto">
          <span className="text-[10px] md:text-[11px] font-black text-blue-900 uppercase">Step 1: Verify PNR Number</span>
          <input 
            value={manualPNR} 
            onChange={(e) => setManualPNR(e.target.value)}
            className="border-b-2 border-blue-100 outline-none text-blue-900 font-bold text-base md:text-lg w-full md:w-64 focus:border-blue-900 transition-colors py-1"
            placeholder="Enter PNR/PEN..."
          />
        </div>
        <div className="text-center md:text-right w-full md:w-auto">
          <p className="text-[9px] md:text-[10px] text-gray-400 font-bold mb-2 uppercase">Ready to generate official copy?</p>
          <button 
            onClick={handlePrint}
            className="w-full md:w-auto bg-blue-900 text-white px-8 md:px-10 py-3 rounded-lg font-black uppercase tracking-tighter hover:bg-blue-800 transition-all shadow-lg active:scale-95"
          >
            Generate & Print TC
          </button>
        </div>
      </div>

      <div className="mt-6 md:mt-8 p-6 md:p-10 bg-white/5 rounded-lg border border-white/10 text-center w-full max-w-lg">
        <p className="text-white font-medium text-sm md:text-base">TC Preview is optimized for print.</p>
        <p className="text-slate-400 text-xs md:text-sm mt-2 italic">Official certificate will include ornamental borders and vintage fonts.</p>
      </div>

      {/* TC Content Area (Hidden on screen) */}
      <div id="tc-content" className="hidden">
        <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-blue-800">
          <p>UDISE CODE: 03140201602</p>
          <p>PNR / PEN: <span className="underline">{manualPNR || student.pnrNumber || "__________"}</span></p>
        </div>

        <div className="text-center mt-6">
          <h1 className="header-title text-5xl font-black uppercase tracking-tight">S. D. Model Sr. Sec. School</h1>
          <p className="text-[10px] font-bold tracking-[0.5em] my-1 text-slate-500">AFFILIATED TO C.B.S.E. NEW DELHI | CODE: 1630610</p>
          <p className="text-sm font-bold italic">New Sant Nagar, Mandi Gobindgarh (Punjab)</p>
          
          <div className="mt-8 mb-10 inline-block bg-blue-900 text-white px-12 py-2">
            <h2 className="text-2xl font-serif font-bold uppercase tracking-[0.4em]">Transfer Certificate</h2>
          </div>
        </div>

        <div className="flex justify-between text-xs font-black border-y-2 border-blue-900/10 py-3 uppercase italic mb-10">
          <p>Adm No: <span className="text-lg ml-2 not-italic">{student.regNo}</span></p>
          <p>Roll No: <span className="text-lg ml-2 not-italic">{student.rollNumber || "---"}</span></p>
          <p>Session: <span className="text-lg ml-2 not-italic">{student.session}</span></p>
        </div>

        <div className="space-y-6 text-[17px] leading-relaxed">
          <div className="flex items-center">
            <span className="font-bold">1. Name of the Pupil:</span>
            <span className="dotted-line px-4">{student.name}</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold">2. Father's / Guardian's Name:</span>
            <span className="dotted-line font-bold italic uppercase px-4">{student.fatherName}</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold">3. Mother's Name:</span>
            <span className="dotted-line font-bold italic uppercase px-4">{student.motherName}</span>
          </div>
          <div className="grid grid-cols-2 gap-10">
            <div className="flex items-center">
              <span className="font-bold">4. Nationality:</span>
              <span className="dotted-line px-4 italic font-bold">INDIAN</span>
            </div>
            <div className="flex items-center">
              <span className="font-bold">5. Category:</span>
              <span className="dotted-line px-4 italic font-bold uppercase">{student.category || "GENERAL"}</span>
            </div>
          </div>
          <div className="flex items-center">
            <span className="font-bold">6. Date of Birth (in Christian Era):</span>
            <span className="dotted-line font-bold px-4 tracking-widest">
                {student.dob ? new Date(student.dob).toLocaleDateString('en-GB') : "---"}
            </span>
          </div>
          <div className="flex items-center">
            <span className="font-bold">7. Class in which the pupil last studied:</span>
            <span className="dotted-line font-black italic uppercase px-4 text-xl">{student.className}</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold">8. Result:</span>
            <span className="dotted-line px-4 font-bold uppercase">PASSED</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold">9. Subjects Studied:</span>
            <span className="dotted-line px-4 text-sm font-bold italic uppercase">
              {student.subjects?.join(", ") || "English, Hindi, Punjabi, Maths, Science, S.St."}
            </span>
          </div>
          <div className="flex items-center">
            <span className="font-bold">10. Promotion to Higher Class:</span>
            <span className="dotted-line px-4 font-black uppercase italic">{student.isPromotion ? "GRANTED" : "NO"}</span>
          </div>
        </div>

        <div className="mt-32 flex justify-between items-end">
          <div className="text-center w-32 border-t border-blue-900 pt-1">
            <p className="text-[10px] font-black uppercase">Class Teacher</p>
          </div>
          <div className="text-center w-32 border-t border-blue-900 pt-1">
            <p className="text-[10px] font-black uppercase">Checked By</p>
          </div>
          <div className="text-center w-56 border-t-2 border-blue-900 pt-1">
            <p className="text-[14px] font-black uppercase tracking-widest">Principal Signature</p>
            <p className="text-[9px] italic font-bold text-slate-500">(With School Office Seal)</p>
          </div>
        </div>

        <div className="mt-12 flex justify-between text-[10px] font-bold text-slate-400">
           <p>Date of Issue: {new Date().toLocaleDateString('en-GB')}</p>
           <p>Place: Mandi Gobindgarh</p>
        </div>
      </div>
    </div>
  );
};

export default TransferCertificate;