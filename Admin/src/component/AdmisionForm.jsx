import React, { useRef, useState, useEffect } from "react";
import { db } from "../firebase"; 
import { doc, getDoc } from "firebase/firestore";

export default function AdmissionDetails({ studentId, onClose }) {
    const printRef = useRef();
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPrinting, setIsPrinting] = useState(false); 
    const [finalPhoto, setFinalPhoto] = useState(null);
    
    const [school, setSchool] = useState({
        name: "Sun Shine School",
        address: "mahanua",
        affiliation: "up board",
        logoUrl: "https://firebasestorage.googleapis.com/v0/b/jnschool-6e62e.firebasestorage.app/o/school_logo%2Fmain_logo?alt=media&token=deddab30-5313-4f49-af39-7b15b6ddb9e3",
        phone: "234565467"
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!studentId) return;
            try {
                setLoading(true);
                const schoolSnap = await getDoc(doc(db, "settings", "schoolDetails"));
                if (schoolSnap.exists()) setSchool(schoolSnap.data());

                const docSnap = await getDoc(doc(db, "students", studentId));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setStudent(data);
                    
                    if (data.photoURL) {
                        const proxyUrl = `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=${encodeURIComponent(data.photoURL)}`;
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        img.src = proxyUrl;
                        img.onload = () => { setFinalPhoto(proxyUrl); setLoading(false); };
                        img.onerror = () => { setFinalPhoto(data.photoURL); setLoading(false); };
                    } else { setLoading(false); }
                } else { setLoading(false); }
            } catch (err) { 
                console.error(err); 
                setLoading(false); 
            }
        };
        fetchData();
    }, [studentId]);

const handlePrint = () => {
    setIsPrinting(true);

    const content = printRef.current.innerHTML;

    let oldIframe = document.getElementById("print-iframe");
    if (oldIframe) oldIframe.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "print-iframe";
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const docIframe = iframe.contentWindow.document;

    docIframe.open();
    docIframe.write(`
        <html>
        <head>
            <title>Admission_Slip_${student?.name}</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
                @page {
                    size: A4 portrait;
                    margin: 5mm;
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: sans-serif;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .print-wrapper {
                    width: 200mm;
                    margin: 0 auto;
                }
                .sheet-container {
                    border: 2px solid #000 !important;
                    padding: 5mm;
                    min-height: 135mm;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    margin-bottom: 5mm;
                    background: #fff !important;
                    page-break-inside: avoid;
                }
                img {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .bg-gray-50 { background-color: #f9fafb !important; }
                .bg-gray-800 { background-color: #1f2937 !important; }
                .bg-black { background-color: #000000 !important; }
                .text-white { color: #ffffff !important; }
                .text-blue-900 { color: #1e3a8a !important; }
                .border-black { border-color: #000000 !important; }
                @media print {
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <div class="print-wrapper">
                ${content}
            </div>
            <script>
                window.onload = function () {
                    setTimeout(() => {
                        window.focus();
                        window.print();
                        setTimeout(() => {
                            window.frameElement.remove();
                        }, 500);
                    }, 800);
                };
            </script>
        </body>
        </html>
    `);

    docIframe.close();
    setTimeout(() => setIsPrinting(false), 2500);
};

    if (loading || isPrinting) {
        return (
            <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-[200] flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
                <h2 className="text-blue-900 font-black tracking-widest uppercase animate-pulse text-lg">
                    {isPrinting ? "Formatting A4 Layout..." : "Loading..."}
                </h2>
            </div>
        );
    }

    if (!student) return null;

    const DocumentSheet = ({ copyName }) => (
        <div className="sheet-container">
            {/* Copy Label */}
            <div className="absolute top-3 right-3 bg-black text-white px-2 py-0.5 text-[9px] font-bold uppercase z-10">
                {copyName}
            </div>
            
            {/* Header */}
            <div className="flex items-center border-b border-black pb-2 mb-2 gap-4">
                <img src={school.logoUrl} className="w-14 h-14 object-contain" alt="logo" />
                <div className="flex-1 text-center pr-10">
                    <h1 className="text-2xl font-black text-blue-900 uppercase leading-none">{school.name}</h1>
                    <p className="text-[9px] font-bold text-gray-700 mt-1 uppercase">{school.affiliation}</p>
                    <p className="text-[8px] text-gray-500 italic">{school.address}</p>
                    <p className="text-[11px] font-bold text-blue-800 uppercase">Contact: {school.phone}</p>
                </div>
            </div>

            {/* Session Bar */}
            <div className="bg-gray-800 text-white text-center text-[9px] font-bold py-1 uppercase tracking-[4px] mb-2">
                Admission Slip | Session {student.session}
            </div>

            {/* Photo & Registration Info */}
            <div className="flex gap-3 mb-2">
                <div className="w-24 h-28 border border-black p-0.5 bg-white shrink-0">
                    <div className="w-full h-full bg-gray-50 flex items-center justify-center overflow-hidden">
                        {finalPhoto ? (
                            <img src={finalPhoto} className="w-full h-full object-cover" alt="student" />
                        ) : (
                            <span className="text-[8px] text-gray-300 font-bold uppercase">Photo</span>
                        )}
                    </div>
                </div>
                <div className="flex-1 grid grid-cols-2 border-t border-l border-black text-[10px]">
                    <div className="p-1 border-r border-b bg-gray-50 font-bold uppercase">Reg No.</div>
                    <div className="p-1 border-r border-b font-black text-blue-900">{student.regNo}</div>
                    <div className="p-1 border-r border-b bg-gray-50 font-bold uppercase">Roll Number</div>
                    <div className="p-1 border-r border-b font-bold">{student.rollNumber || '---'}</div>
                    <div className="p-1 border-r border-b bg-gray-50 font-bold uppercase">Class</div>
                    <div className="p-1 border-r border-b font-black uppercase text-blue-800">{student.className}</div>
                    <div className="p-1 border-r border-b bg-gray-50 font-bold uppercase">Adm. Date</div>
                    <div className="p-1 border-r border-b font-bold">{student.admissionDate || '---'}</div>
                </div>
            </div>

            {/* Main Details Table */}
            <div className="border-t border-l border-black text-[10px] mb-2">
                <div className="grid grid-cols-4">
                    <div className="p-1 border-r border-b bg-gray-50 font-bold uppercase">Student</div>
                    <div className="p-1 border-r border-b font-black col-span-3 uppercase text-blue-900">{student.name}</div>
                    
                    <div className="p-1 border-r border-b bg-gray-50 font-bold uppercase">Father</div>
                    <div className="p-1 border-r border-b font-bold uppercase">{student.fatherName}</div>
                    <div className="p-1 border-r border-b bg-gray-50 font-bold uppercase">Mother</div>
                    <div className="p-1 border-r border-b font-bold uppercase">{student.motherName}</div>

                    <div className="p-1 border-r border-b bg-gray-50 font-bold uppercase">DOB</div>
                    <div className="p-1 border-r border-b font-bold uppercase">{student.dob}</div>
                    <div className="p-1 border-r border-b bg-gray-50 font-bold uppercase">Gender</div>
                    <div className="p-1 border-r border-b font-bold uppercase">{student.gender}</div>

                    <div className="p-1 border-r border-b bg-gray-50 font-bold uppercase">Category</div>
                    <div className="p-1 border-r border-b font-bold uppercase">{student.category}</div>
                    <div className="p-1 border-r border-b bg-gray-50 font-bold uppercase">Phone</div>
                    <div className="p-1 border-r border-b font-bold">{student.phone}</div>

                    <div className="p-1 border-r border-b bg-gray-50 font-bold uppercase">Bus Fees</div>
                    <div className="p-1 border-r border-b font-bold text-green-700">₹{student.busFees || '0'}</div>
                    <div className="p-1 border-r border-b bg-gray-50 font-bold uppercase">Aadhaar</div>
                    <div className="p-1 border-r border-b font-bold">{student.aadhaar || '---'}</div>

                    <div className="p-1 border-r border-b bg-gray-50 font-bold uppercase">Address</div>
                    <div className="p-1 border-r border-b font-medium col-span-3 uppercase text-[9px]">{student.address}</div>
                </div>
            </div>

            {/* Docs & Subjects - FULL LIST DISPLAY */}
            <div className="flex flex-col gap-2 mb-auto">
                <div className="border border-black p-1.5 bg-gray-50">
                    <p className="text-[8px] font-black uppercase text-gray-500 mb-1 border-b border-gray-200">Documents Received:</p>
                    <div className="flex flex-wrap gap-x-4">
                        <span className={student.docPhoto ? "text-blue-800 font-bold text-[8px]" : "text-gray-300 text-[8px]"}>{student.docPhoto ? "☑" : "☐"} PHOTO</span>
                        <span className={student.docAadhaar ? "text-blue-800 font-bold text-[8px]" : "text-gray-300 text-[8px]"}>{student.docAadhaar ? "☑" : "☐"} AADHAAR</span>
                        <span className={student.docTC ? "text-blue-800 font-bold text-[8px]" : "text-gray-300 text-[8px]"}>{student.docTC ? "☑" : "☐"} T.C.</span>
                        <span className={student.docMarksheet ? "text-blue-800 font-bold text-[8px]" : "text-gray-300 text-[8px]"}>{student.docMarksheet ? "☑" : "☐"} MARKSHEET</span>
                    </div>
                </div>
                
                {/* YAHAN SE SAB SUBJECTS DIKHENGE */}
                <div className="border border-black p-1.5 bg-white">
                    <p className="text-[8px] font-black uppercase text-blue-900 mb-1 border-b border-blue-100">Prescribed Subjects:</p>
                    <div className="flex flex-wrap gap-1.5">
                        {student.subjects && student.subjects.length > 0 ? (
                            student.subjects.map((sub, i) => (
                                <span key={i} className="text-[9px] font-black border border-gray-200 px-2 py-0.5 bg-gray-50 uppercase rounded-sm">
                                    {sub}
                                </span>
                            ))
                        ) : (
                            <span className="text-[8px] italic text-gray-400">No subjects assigned</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between px-8 mt-6 pt-2 border-t border-gray-100">
                <div className="text-center">
                    <div className="w-24 border-b border-black mb-1"></div>
                    <p className="text-[8px] font-bold uppercase tracking-tighter">Guardian's Sign</p>
                </div>
                <div className="text-center">
                    <div className="w-24 border-b border-black mb-1"></div>
                    <p className="text-[8px] font-bold uppercase tracking-tighter">Office / Principal Sign</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-gray-200 z-[100] overflow-y-auto pb-10 flex flex-col items-center">
            {/* Top Navigation */}
            <div className="max-w-4xl w-full flex justify-between items-center bg-white p-3 rounded-b-lg shadow-md no-print sticky top-0 z-50 mb-4">
                <button onClick={onClose} className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded font-bold text-xs border border-gray-200 uppercase">
                    Back
                </button>
                <div className="text-center">
                    <h2 className="font-black text-blue-900 uppercase text-sm tracking-widest">Admission Slip Preview</h2>
                </div>
                <button onClick={handlePrint} className="bg-blue-600 text-white px-8 py-1.5 rounded font-bold text-xs uppercase shadow-sm">
                    Print Slip
                </button>
            </div>

            {/* Printable Container */}
            <div ref={printRef} className="w-full max-w-[210mm] bg-white p-4 shadow-xl">
                <DocumentSheet copyName="OFFICE COPY" />
                
                <div className="no-print flex items-center justify-center my-6 opacity-30">
                    <div className="flex-1 border-b border-dashed border-gray-500"></div>
                    <span className="mx-4 text-gray-500 text-[10px] font-bold uppercase tracking-[10px]">✂ CUT HERE</span>
                    <div className="flex-1 border-b border-dashed border-gray-500"></div>
                </div>
                
                <DocumentSheet copyName="STUDENT COPY" />
            </div>
        </div>
    );
}