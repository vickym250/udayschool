import React from "react";

const AdmitCardView = React.forwardRef(({ student, timetable, formatDate }, ref) => {
  if (!student) return null;

  return (
    <div ref={ref} className="admit-card-container">
      <style>{`
        @media screen {
          .admit-card-container { padding: 20px; background: #f9fafb; }
        }

        @media print {
          /* 1. Dashboard aur buttons ko hide karo */
          body * { visibility: hidden; }
          
          /* 2. Sirf admit card ko dikhao */
          .admit-card-container, .admit-card-container * { visibility: visible; }
          
          /* 3. Positioning set karo */
          .admit-card-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          /* 4. Borders aur Colors pakke karo (Screenshot wali problem yahi se solve hogi) */
          .main-border { 
            border: 5px double #000 !important; 
            padding: 30px !important;
            -webkit-print-color-adjust: exact; 
          }
          .title-bar { 
            background-color: #1e1b4b !important; 
            color: white !important; 
            -webkit-print-color-adjust: exact;
            text-align: center;
            padding: 8px !important;
          }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000 !important; padding: 10px !important; text-align: left; }
          th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
          
          @page { size: A4; margin: 10mm; }
        }
      `}</style>

      {/* Main Admit Card Box */}
      <div className="main-border border-4 border-double border-black p-8 bg-white relative min-h-[250mm]">
        
        {/* School Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black text-indigo-950 uppercase leading-none">SUNSHINE PUBLIC SCHOOL</h1>
          <p className="text-xs font-bold text-gray-500 mt-2 tracking-[3px]">REGD NO: 123456 | SESSION 2025-26</p>
          
          <div className="title-bar bg-indigo-950 text-white py-2 px-4 mt-4 font-black uppercase tracking-[0.2em] text-sm w-full">
            Examination Admit Card
          </div>
        </div>

        {/* Student Details Section */}
        <div className="flex justify-between items-start mb-10 gap-10">
          <div className="grid grid-cols-2 gap-x-12 gap-y-6 flex-1 text-sm">
            <div className="border-b border-gray-300 pb-1">
              <span className="text-[10px] font-black text-indigo-900 block uppercase">Student Name</span>
              <span className="font-bold text-lg uppercase">{student.name}</span>
            </div>
            <div className="border-b border-gray-300 pb-1">
              <span className="text-[10px] font-black text-indigo-900 block uppercase">Roll Number</span>
              <span className="font-black text-2xl text-red-600 tracking-tighter">{student.rollNumber}</span>
            </div>
            <div className="border-b border-gray-300 pb-1">
              <span className="text-[10px] font-black text-indigo-900 block uppercase">Father's Name</span>
              <span className="font-bold uppercase text-gray-700">{student.fatherName}</span>
            </div>
            <div className="border-b border-gray-300 pb-1">
              <span className="text-[10px] font-black text-indigo-900 block uppercase">Class</span>
              <span className="font-bold uppercase text-gray-700">{student.className}</span>
            </div>
          </div>
          
          {/* Photo Placeholder */}
          <div className="w-32 h-40 border-2 border-black flex items-center justify-center bg-gray-50 flex-shrink-0">
            {student.photoURL ? (
              <img src={student.photoURL} alt="student" className="w-full h-full object-cover" />
            ) : (
              <div className="text-[10px] text-gray-300 font-bold text-center p-2 uppercase italic">Paste Photo Here</div>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="mb-12">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-3 text-left text-xs font-black uppercase">Date & Day</th>
                <th className="border border-black p-3 text-left text-xs font-black uppercase">Subject</th>
                <th className="border border-black p-3 text-center text-xs font-black uppercase">Exam Timing</th>
              </tr>
            </thead>
            <tbody>
              {timetable && timetable.length > 0 ? (
                timetable.map((e, i) => (
                  <tr key={i}>
                    <td className="border border-black p-3 text-xs font-bold uppercase">{formatDate(e.date)}</td>
                    <td className="border border-black p-3 text-xs font-black uppercase italic">{e.subject}</td>
                    <td className="border border-black p-3 text-xs text-center font-bold">{e.time}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="3" className="border border-black p-10 text-center italic text-gray-400">Time table not updated yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-auto flex justify-between items-end px-6 pt-10">
          <div className="text-center w-40">
            <div className="border-t-2 border-black pt-2 uppercase font-black text-[10px]">Student's Sign</div>
          </div>
          <div className="text-center w-40">
            <div className="border-t-2 border-black pt-2 uppercase font-black text-[10px]">Principal Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default AdmitCardView;