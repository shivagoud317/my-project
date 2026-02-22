import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const form = document.getElementById("registerForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const collegeId = document.getElementById("collegeId").value;
  const phone = document.getElementById("phone").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  try {
    // 1️⃣ Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const uid = userCredential.user.uid;

    // 2️⃣ Store extra details in Firestore
    await setDoc(doc(db, "users", uid), {
      name: name,
      collegeId: collegeId,
      phone: phone,
      email: email,
      role: role,
      createdAt: serverTimestamp()
    });

    alert("Registration successful!");

    // 3️⃣ Redirect based on role
    if (role === "admin") {
      window.location.href = "admin.html";
    } else if (role === "faculty") {
      window.location.href = "faculty.html";
    } else {
      window.location.href = "student.html";
    }

  } catch (error) {
    alert(error.message);
    console.error(error);
  }
});
