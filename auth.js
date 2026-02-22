import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================= REGISTER ================= */
const registerBtn = document.getElementById("registerBtn");

if (registerBtn) {
  registerBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const name = document.getElementById("fullName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const role = document.getElementById("role").value;
    const studentId = document.getElementById("userId").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const mentorNameInput = document.getElementById("mentorName");
    const mentorEmailInput = document.getElementById("mentorEmail");
    const mentorName = mentorNameInput ? mentorNameInput.value.trim() : "";
    const mentorEmail = mentorEmailInput ? mentorEmailInput.value.trim() : "";

    if (!name || !email || !password || !role || !studentId || !phone) {
      alert("Please fill all fields");
      return;
    }

    if (role === "student" && (!mentorName || !mentorEmail)) {
      alert("Please provide mentor name and mentor email for students.");
      return;
    }

    try {
      // Create Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      let mentorId = null;

      // Link student to faculty account using mentorEmail, if provided
      if (role === "student" && mentorEmail) {
        try {
          const q = query(
            collection(db, "users"),
            where("email", "==", mentorEmail),
            where("role", "==", "faculty")
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            mentorId = snap.docs[0].id;
          }
        } catch (linkErr) {
          console.error("Error linking mentor by email:", linkErr);
        }
      }

      // Store user data in Firestore
      const userData = {
        name: name,
        email: email,
        role: role,
        userId: studentId,
        phone: phone,
        createdAt: serverTimestamp()
      };

      if (role === "student") {
        userData.mentorName = mentorName;
        userData.mentorEmail = mentorEmail;
        if (mentorId) {
          userData.mentorId = mentorId;
        }
      }

      await setDoc(doc(db, "users", uid), userData);

      alert("Registered successfully");

      setTimeout(() => {
        window.location.href = "index.html";
      }, 800);

    } catch (error) {
      alert(error.message);
    }
  });
}

/* ================= LOGIN ================= */
const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {
  loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      alert("Enter email and password");
      return;
    }

    try {
      const userCredential =
        await signInWithEmailAndPassword(auth, email, password);

      const userDoc = await getDoc(
        doc(db, "users", userCredential.user.uid)
      );

      if (!userDoc.exists()) {
        alert("No account found. Please register.");
        window.location.href = "register.html";
        return;
      }

      const role = userDoc.data().role;

      alert("Login successful");

      if (role === "admin") {
        window.location.href = "admin.html";
      } else if (role === "faculty") {
        window.location.href = "faculty.html";
      } else {
        window.location.href = "student.html";
      }

    } catch (error) {
      if (error.code === "auth/user-not-found") {
        alert("No account found. Please register.");
        window.location.href = "register.html";
      } else {
        alert(error.message);
      }
    }
  });
}
