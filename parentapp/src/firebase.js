// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth"; // 👈 Ye missing tha


const firebaseConfig = {
  apiKey: "AIzaSyD0_wYi3E5SZKogwq2wxo3blUFx8qxbD6w",
  authDomain: "udayschool-ef396.firebaseapp.com",
  projectId: "udayschool-ef396",
  storageBucket: "udayschool-ef396.firebasestorage.app",
  messagingSenderId: "1060969783789",
  appId: "1:1060969783789:web:2abfbe9f26a3bd331287e4",
  measurementId: "G-7KFBZHQSNG"
};

const app = initializeApp(firebaseConfig);

// 👇 Teeno cheezein export karni zaroori hain
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app); // 👈 Isko add kiya