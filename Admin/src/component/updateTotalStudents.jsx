import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";              // SCHOOL firebase
import { masterDB } from "../masterFirebase";  // ALLSCHOOL firebase

const SCHOOL_DOC_ID = "qTPKVuyx3BiWzTNJOlYA";  // master school doc id

// 🔥 AUTO CURRENT SESSION (April–March)
const getCurrentSession = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1–12

  return month >= 4
    ? `${year}-${String(year + 1).slice(-2)}`
    : `${year - 1}-${String(year).slice(-2)}`;
};

export const updateTotalStudents = async () => {
  const CURRENT_SESSION = getCurrentSession(); // 🔥 auto session

  const q = query(
    collection(db, "students"),
    where("session", "==", CURRENT_SESSION),
    where("deletedAt", "==", null)
  );

  const snap = await getDocs(q);

  await updateDoc(
    doc(masterDB, "schools", SCHOOL_DOC_ID),
    {
      totalStudents: snap.size,// (optional but useful)
    }
  );
};
