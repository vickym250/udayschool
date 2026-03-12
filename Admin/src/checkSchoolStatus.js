import { doc, getDoc } from "firebase/firestore";
import { masterDB } from "./masterFirebase";

export const checkSchoolStatus = async () => {
  // 👇 EXACT wahi ID jo Firestore me hai
  const SCHOOL_DOC_ID = "qTPKVuyx3BiWzTNJOlYA";

  const ref = doc(masterDB, "schools", SCHOOL_DOC_ID);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return {
      active: false,
      message: "School not registered",
    };
  }

  const data = snap.data();

  return {
    active: data.status === "Active",
    message:
      data.status === "Active"
        ? ""
        : "School account inactive. Contact admin.",
  };
};
