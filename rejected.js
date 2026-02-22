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
    loadRejectedRegistrations(user.uid);
});

async function loadRejectedRegistrations(mentorId) {
    const container = document.getElementById("rejectedRegistrationsList");
    if (!container) return;

    container.innerHTML = "Loading rejected registrations...";

    try {
        const q = query(
            collection(db, "registrations"),
            where("mentorId", "==", mentorId),
            where("status", "==", "rejected")
        );

        const snap = await getDocs(q);
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = "<p>No rejected registration requests.</p>";
            return;
        }

        snap.forEach((docSnap) => {
            const data = docSnap.data();

            const card = document.createElement("div");
            card.className = "event-card";
            card.innerHTML = `
        <h4>${data.eventName || "Event"}</h4>
        <p><strong>Student:</strong> ${data.studentName || "Student"}</p>
        <p><strong>Email:</strong> ${data.studentEmail || "Email"}</p>
        <div style="margin-top: 15px;">
           <span style="background: red; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
            REJECTED
          </span>
        </div>
      `;

            container.appendChild(card);
        });

    } catch (err) {
        console.error("FULL ERROR:", err);
        alert(err.message);
    }
}
