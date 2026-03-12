// 🔥 Core Firebase
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ✅ MASTER (AllSchoolAdmin) config
const masterConfig = {
apiKey: "AIzaSyBfk8oOnV0Sy4yUHpbg4fyR86pyv5LjKzM",
  authDomain: "allschooladmin.firebaseapp.com",
  projectId: "allschooladmin",
};

const masterApp =
  getApps().some(app => app.name === "master")
    ? getApp("master")
    : initializeApp(masterConfig, "master");

export const masterDB = getFirestore(masterApp);
