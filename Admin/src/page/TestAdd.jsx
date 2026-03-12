import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export default function TestPage() {
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    title: "",
    subject: "",
    className: "Class 1",
    date: "",
  });

  const [questions, setQuestions] = useState([
    { q: "", optionA: "", optionB: "", optionC: "", optionD: "", correct: "" },
  ]);

  const [tests, setTests] = useState([]);

  // ============================
  // READ EXCEL FILE & IMPORT QUESTIONS
  // ============================
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const data = event.target.result;
      const workbook = XLSX.read(data, { type: "binary" });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(sheet);

      const formatted = rows.map((r) => ({
        q: r.Question || "",
        optionA: r.OptionA || "",
        optionB: r.OptionB || "",
        optionC: r.OptionC || "",
        optionD: r.OptionD || "",
        correct: r.Correct || "",
      }));

      setQuestions(formatted);
      toast.success("Excel Imported Successfully!");
    };

    reader.readAsBinaryString(file);
  };

  // Load tests realtime
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tests"), (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setTests(list);
    });
    return () => unsub();
  }, []);

  // Add question manually
  const addQuestion = () => {
    setQuestions([
      ...questions,
      { q: "", optionA: "", optionB: "", optionC: "", optionD: "", correct: "" },
    ]);
  };

  // Save test
  const handleSaveTest = async (e) => {
    e.preventDefault();

    await addDoc(collection(db, "tests"), {
      ...form,
      questions,
      createdAt: new Date(),
    });

    toast.success("Test Added Successfully!");

    setOpen(false);
    setForm({ title: "", subject: "", className: "Class 1", date: "" });
    setQuestions([
      { q: "", optionA: "", optionB: "", optionC: "", optionD: "", correct: "" },
    ]);
  };

  // Delete test
  const handleDelete = (id) => {
    toast(
      (t) => (
        <div>
          <p className="font-bold">Delete this Test?</p>
          <button
            className="bg-red-600 text-white px-3 py-1 rounded mt-2"
            onClick={async () => {
              await deleteDoc(doc(db, "tests", id));
              toast.dismiss(t.id);
              toast.success("Deleted Successfully!");
            }}
          >
            Yes Delete
          </button>
        </div>
      ),
      { duration: 4000 }
    );
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-3xl font-bold mb-6">Test Management</h2>

      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 text-white px-5 py-2 rounded-lg mb-6"
      >
        ➕ Add Test
      </button>

      {/* ============================
          POPUP FORM
      ============================ */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-2xl p-6 rounded-lg shadow-lg overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold mb-4">Add New Test</h3>

            <form onSubmit={handleSaveTest} className="grid gap-4">
              <input
                className="border p-3 rounded"
                placeholder="Test Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />

              <input
                className="border p-3 rounded"
                placeholder="Subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
              />

              <select
                className="border p-3 rounded"
                value={form.className}
                onChange={(e) => setForm({ ...form, className: e.target.value })}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i}>Class {i + 1}</option>
                ))}
              </select>

              <input
                type="date"
                className="border p-3 rounded"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />

              {/* Excel Import */}
              <div>
                <p className="font-bold mb-1">Upload Excel File</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="border p-2 rounded"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Columns: Question | OptionA | OptionB | OptionC | OptionD | Correct
                </p>
              </div>

              <h3 className="font-bold text-lg">Questions</h3>

              {questions.map((q, i) => (
                <div key={i} className="border p-4 bg-gray-50 rounded-lg mb-3">
                  <input
                    className="border p-2 rounded w-full mb-2"
                    placeholder={`Question ${i + 1}`}
                    value={q.q}
                    onChange={(e) => {
                      questions[i].q = e.target.value;
                      setQuestions([...questions]);
                    }}
                    required
                  />

                  <div className="grid grid-cols-2 gap-2">
                    {["A", "B", "C", "D"].map((opt) => (
                      <input
                        key={opt}
                        className="border p-2 rounded"
                        placeholder={`Option ${opt}`}
                        value={q[`option${opt}`]}
                        onChange={(e) => {
                          questions[i][`option${opt}`] = e.target.value;
                          setQuestions([...questions]);
                        }}
                        required
                      />
                    ))}
                  </div>

                  <select
                    className="border mt-2 p-2 rounded w-full"
                    value={q.correct}
                    onChange={(e) => {
                      questions[i].correct = e.target.value;
                      setQuestions([...questions]);
                    }}
                    required
                  >
                    <option value="">Correct Answer</option>
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
              ))}

              <button
                type="button"
                onClick={addQuestion}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                ➕ Add Question
              </button>

              <button className="bg-blue-600 text-white py-3 rounded text-lg">
                Save Test
              </button>
            </form>

            <button
              onClick={() => setOpen(false)}
              className="text-red-500 font-bold mt-4 block text-center"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ============================
             ALL TESTS LIST
      ============================ */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="text-xl font-bold mb-4">All Tests</h3>

        {tests.length === 0 ? (
          <p>No Tests Added Yet...</p>
        ) : (
          <div className="grid gap-4">
            {tests.map((t) => (
              <div className="p-4 bg-gray-50 border rounded" key={t.id}>
                <h3 className="text-lg font-bold">{t.title}</h3>
                <p>Subject: {t.subject}</p>
                <p>Class: {t.className}</p>
                <p>Date: {t.date}</p>
                <p>Total Questions: {t.questions.length}</p>

                <button
                  onClick={() => handleDelete(t.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded mt-3"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
