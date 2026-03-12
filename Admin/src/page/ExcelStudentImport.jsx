import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  arrayUnion,
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import { db } from "../firebase";

export default function BulkStudentImport() {

  const [loading, setLoading] = useState(false);
  const [subjectMapping, setSubjectMapping] = useState({});

  const monthsFull = [
    "April","May","June","July","August",
    "September","October","November",
    "December","January","February","March"
  ];

  const monthsShort = [
    "Apr","May","Jun","Jul","Aug",
    "Sep","Oct","Nov","Dec","Jan","Feb","Mar"
  ];

  // 🔥 Subject Mapping
  useEffect(() => {
    const fetchMapping = async () => {
      const snap = await getDoc(
        doc(db, "school_config", "master_data")
      );
      if (snap.exists()) {
        setSubjectMapping(
          snap.data().mapping || {}
        );
      }
    };
    fetchMapping();
  }, []);

  // 📊 Attendance
  const createAttendance = () => {
    return monthsFull.reduce((acc, m) => {
      acc[m] = { present: 0, absent: 0 };
      return acc;
    }, {});
  };

  // 💰 Fees
  const createFeesStructure = (session) => {
    const obj = {};
    obj[session] = {};

    monthsShort.forEach((m) => {
      obj[session][m] = {
        status: "Unpaid",
        receiptId: "",
        paidAt: ""
      };
    });

    return obj;
  };

  // 📂 Upload
  const handleFileUpload = async (e) => {

    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);

    try {

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];
      const excelData =
        XLSX.utils.sheet_to_json(sheet);

      if (excelData.length === 0) {
        alert("Excel empty hai");
        setLoading(false);
        return;
      }

      // 🔢 Sessions / Classes
      const sessions = [
        ...new Set(
          excelData.map(
            r => r.session || "2025-26"
          )
        )
      ];

      const classes = [
        ...new Set(
          excelData.map(
            r => r.className || "Unknown"
          )
        )
      ];

      // 🔢 REG TRACKER
      let regTracker = {};

      for (let session of sessions) {

        const q1 = query(
          collection(db, "students"),
          where("session", "==", session)
        );

        const snap = await getDocs(q1);

        let max = 1000;

        snap.forEach(d => {
          const r =
            parseInt(
              d.data().regNo
            );
          if (!isNaN(r) && r > max)
            max = r;
        });

        regTracker[session] = max;
      }

      // 🔢 ROLL TRACKER
      let rollTracker = {};

      for (let cls of classes) {

        rollTracker[cls] = {};

        for (let session of sessions) {

          const q2 = query(
            collection(db, "students"),
            where("className", "==", cls),
            where("session", "==", session)
          );

          const snap = await getDocs(q2);

          let max = 0;

          snap.forEach(d => {
            const r =
              parseInt(
                d.data().rollNumber
              );
            if (!isNaN(r) && r > max)
              max = r;
          });

          rollTracker[cls][session] = max;
        }
      }

      // 🚀 IMPORT LOOP
      for (const row of excelData) {

        try {

          const session =
            row.session || "2025-26";

          const className =
            row.className || "Unknown";

          if (!regTracker[session])
            regTracker[session] = 1000;

          if (!rollTracker[className])
            rollTracker[className] = {};

          if (!rollTracker[className][session])
            rollTracker[className][session] = 0;

          regTracker[session] += 1;
          rollTracker[className][session] += 1;

          const regNo =
            regTracker[session].toString();

          const rollNumber =
            rollTracker[className][session]
              .toString();

          const phone =
            row.phone
              ?.toString()
              .trim() ||
            "0000000000";

          // 👨‍👩‍👧 PARENT
          let parentId = null;

          const pq = query(
            collection(db, "parents"),
            where("phone", "==", phone)
          );

          const psnap = await getDocs(pq);

          if (!psnap.empty) {

            parentId =
              psnap.docs[0].id;

          } else {

            const pDoc = await addDoc(
              collection(db, "parents"),
              {
                fatherName:
                  row.fatherName ?? "",
                motherName:
                  row.motherName ?? "",
                phone,
                address:
                  row.address ?? "",

                // 🔥 ARRAYS FORCE
                students: [],
                fcmTokens: [],

                createdAt:
                  serverTimestamp()
              }
            );

            parentId = pDoc.id;
          }

          // 🧾 STUDENT
          const sDoc = await addDoc(
            collection(db, "students"),
            {
              name: row.name ?? "",
              className,
              rollNumber,
              regNo,
              phone,

              fatherName:
                row.fatherName ?? "",
              motherName:
                row.motherName ?? "",
              address:
                row.address ?? "",
              aadhaar:
                row.aadhaar ?? "",
              gender:
                row.gender ?? "",
              category:
                row.category ?? "",
              dob: row.dob ?? "",
              session,
              admissionDate:
                row.admissionDate ?? "",
              transportId:
                row.transportId ?? "",
              transportFees:
                Number(
                  row.transportFees ?? 0
                ),
              isTransferStudent:
                Boolean(
                  row.isTransferStudent
                ),
              pnrNumber:
                row.pnrNumber ?? "",
              photoURL: "",

              parentId, // 🔥 LINK

              subjects:
                subjectMapping[
                  className
                ] || [],

              attendance:
                createAttendance(),

              fees:
                createFeesStructure(
                  session
                ),

              currentBalance: 0,

              docAadhaar:
                Boolean(row.docAadhaar),
              docMarksheet:
                Boolean(row.docMarksheet),
              docTC:
                Boolean(row.docTC),
              docPhoto:
                Boolean(row.docPhoto),

              // 🔥 ARRAY FORCE
              fcmTokens: [],

              deletedAt: null,
              createdAt:
                serverTimestamp()
            }
          );

          // 🔗 Parent Update
          await updateDoc(
            doc(db, "parents", parentId),
            {
              students:
                arrayUnion(
                  sDoc.id
                )
            }
          );

        } catch (err) {
          console.error(
            "Row Error:",
            err
          );
        }
      }

      alert(
        "✅ Bulk Import Completed"
      );

    } catch (err) {

      console.error(
        "Import Failed:",
        err
      );

      alert(
        "❌ Import Failed"
      );
    }

    setLoading(false);
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-xl max-w-md">

      <h2 className="text-xl font-bold mb-4">
        🚀 PRO Bulk Student Import
      </h2>

      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        className="border p-2 w-full"
      />

      {loading && (
        <p className="mt-4 text-blue-600 font-bold">
          Importing Students...
        </p>
      )}
    </div>
  );
}