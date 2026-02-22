import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }
    loadStudents(user.email);
});

async function loadStudents(mentorEmail) {
    const container = document.getElementById("studentsList");
    if (!container) return;

    container.innerHTML = "Loading students...";

    try {
        const q = query(
            collection(db, "users"),
            where("role", "==", "student"),
            where("mentorEmail", "==", mentorEmail)
        );

        const snap = await getDocs(q);
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = "<p>No allocated students found.</p>";
            return;
        }

        snap.forEach((docSnap) => {
            const student = docSnap.data();
            const studentId = docSnap.id;

            const btn = document.createElement("button");
            btn.style = "width: 100%; padding: 15px; margin-bottom: 10px; text-align: left; font-size: 16px; background: white; border: 1px solid #ccc; border-radius: 8px; cursor: pointer;";

            btn.innerHTML = `
        <strong>${student.name || "Unknown Student"}</strong><br>
        <span style="font-size: 14px; color: #555;">${student.email || "No email"}</span>
      `;

            btn.onclick = () => {
                window.location.href = `student-events.html?studentId=${studentId}`;
            };

            container.appendChild(btn);
        });
    } catch (error) {
        console.error("Error loading students:", error);
        container.innerHTML = "<p>Failed to load students.</p>";
    }
}
