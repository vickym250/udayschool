import React, { useEffect, useState } from "react";
import { db, storage } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";

export default function NoticePage() {
  const [audience, setAudience] = useState("ALL");
  const [noticeData, setNoticeData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    file: null,
    audience: "ALL",
  });

  // 🔥 Load Notices in Realtime
  useEffect(() => {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNoticeData(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter Notices Based on selected audience
  const filteredNotices = noticeData.filter((n) => {
    if (audience === "ALL") return true;
    if (audience === "TEACHERS") return n.audience === "TEACHERS" || n.audience === "ALL";
    if (audience === "STUDENTS") return n.audience === "STUDENTS" || n.audience === "ALL";
    return n.audience === audience; // Class wise
  });

  // Add Notice
  const handleSubmit = async (e) => {
    e.preventDefault();
    toast.loading("Uploading...", { id: "loading" });

    let fileURL = "";

    try {
      // Upload file
      if (form.file) {
        const fileRef = ref(storage, `notices/${Date.now()}_${form.file.name}`);
        await uploadBytes(fileRef, form.file);
        fileURL = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, "notices"), {
        title: form.title,
        description: form.description,
        date: form.date,
        fileURL,
        audience: form.audience,
        createdAt: new Date(),
      });

      toast.success("Notice Added!", { id: "loading" });

      setForm({
        title: "",
        description: "",
        date: "",
        file: null,
        audience: "ALL",
      });

      setOpen(false);

    } catch (err) {
      toast.error("Error adding notice", { id: "loading" });
      console.error(err);
    }
  };

  // Delete Notice
  const handleDelete = (id) => {
    toast(
      (t) => (
        <div>
          <p className="font-semibold text-red-600">Delete Notice?</p>

          <div className="flex gap-2 mt-2">
            <button
              className="bg-red-600 text-white px-3 py-1 rounded"
              onClick={async () => {
                await deleteDoc(doc(db, "notices", id));
                toast.dismiss(t.id);
                toast.success("Notice Deleted!");
              }}
            >
              Yes
            </button>

            <button
              className="bg-gray-300 px-3 py-1 rounded"
              onClick={() => toast.dismiss(t.id)}
            >
              No
            </button>
          </div>
        </div>
      ),
      { duration: 4500 }
    );
  };

  return (
    <div className="  container mx-auto p-6 bg-gray-100 min-h-screen">

      <h2 className="text-2xl font-bold mb-4">Notice Board (Audience Wise)</h2>

      {/* Audience Selector */}
      <div className="flex gap-4 mb-6">

        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="border px-4 py-2 rounded-lg"
        >
          <option value="ALL">All</option>
          <option value="TEACHERS">Teachers</option>
          <option value="STUDENTS">Students</option>

          {[...Array(12)].map((_, i) => (
            <option key={i} value={`Class ${i + 1}`}>
              Class {i + 1}
            </option>
          ))}
        </select>

        <button
          onClick={() => setOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Add Notice
        </button>

      </div>

      {/* Notice List */}
      {loading ? (
        <p>Loading notices...</p>
      ) : filteredNotices.length === 0 ? (
        <p>No notices available for this audience.</p>
      ) : (
        <div className="grid gap-4">
          {filteredNotices.map((n) => (
            <div key={n.id} className="p-4 bg-white shadow rounded-lg">
              <h3 className="text-xl font-bold">{n.title}</h3>
              <p className="text-gray-700">{n.description}</p>
              <p className="text-sm text-gray-500 mt-1">Date: {n.date}</p>
              
              <p className="text-xs mt-2 px-2 py-1 bg-gray-200 inline-block rounded">
                Audience: {n.audience}
              </p>

              {n.fileURL && (
                <a
                  href={n.fileURL}
                  target="_blank"
                  className="text-blue-600 underline mt-2 block"
                >
                  View File
                </a>
              )}

              <button
                className="mt-3 bg-red-600 text-white px-3 py-1 rounded"
                onClick={() => handleDelete(n.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Notice Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">

            <h2 className="text-xl font-semibold mb-4">Add New Notice</h2>

            <form onSubmit={handleSubmit} className="grid gap-4">

              <input
                type="text"
                placeholder="Notice Title"
                className="border p-2 rounded"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />

              <textarea
                placeholder="Description"
                className="border p-2 rounded"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                required
              />

              <input
                type="date"
                className="border p-2 rounded"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />

              {/* Audience Select */}
              <select
                className="border p-2 rounded"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
              >
                <option value="ALL">All</option>
                <option value="TEACHERS">Teachers</option>
                <option value="STUDENTS">Students</option>

                {[...Array(12)].map((_, i) => (
                  <option key={i} value={`Class ${i + 1}`}>
                    Class {i + 1}
                  </option>
                ))}
              </select>

              <input
                type="file"
                className="border p-2 rounded"
                onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
              />

              <button className="bg-blue-600 text-white py-2 rounded-lg">
                Add Notice
              </button>

            </form>

            <button
              className="mt-3 text-red-500 font-bold"
              onClick={() => setOpen(false)}
            >
              Close
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
