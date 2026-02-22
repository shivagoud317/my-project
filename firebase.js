

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔴 PASTE YOUR FIREBASE CONFIG HERE
// Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA-CjQKFYT7539b94xu6B-Fp3uk_1CXLgQ",
  authDomain: "event-attendance-mxg.firebaseapp.com",
  projectId: "event-attendance-mxg",
  storageBucket: "event-attendance-mxg.firebasestorage.app",
  messagingSenderId: "724238382253",
  appId: "1:724238382253:web:84f338149993e938674224"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
