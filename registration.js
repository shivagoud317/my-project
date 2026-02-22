import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get("eventId");

    if (eventId) {
        loadRegistrationsForEvent(eventId);
    } else {
        const container = document.getElementById("allRegistrationsList");
        if (container) container.innerHTML = "<p>No event specified.</p>";
    }
});

/* ================= ADMIN: LOAD REGISTRATIONS FOR EVENT ================= */
async function loadRegistrationsForEvent(eventId) {
    const container = document.getElementById("allRegistrationsList");
    if (!container) return;

    container.innerHTML = "Loading registrations...";

    try {
        const q = query(
            collection(db, "registrations"),
            where("eventId", "==", eventId)
        );
        const snap = await getDocs(q);
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = "<p>No registrations found for this event.</p>";
            return;
        }

        snap.forEach((docSnap) => {
            const r = docSnap.data();
            const status = (r.status || "pending").toLowerCase();

            // Determine Badge Color
            let badgeColor = "gray";
            if (status === "approved") badgeColor = "green";
            else if (status === "rejected") badgeColor = "red";
            else if (status === "pending") badgeColor = "orange";

            const div = document.createElement("div");
            div.className = "event-card";

            div.innerHTML = `
        <p><strong>Student Name:</strong> ${r.studentName || "N/A"}</p>
        <p><strong>Student Email:</strong> ${r.studentEmail || "N/A"}</p>
        <p style="margin-top: 10px;">
          <strong>Status:</strong> 
          <span style="background: ${badgeColor}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
            ${status.toUpperCase()}
          </span>
        </p>
      `;

            container.appendChild(div);
        });
    } catch (err) {
        console.error("Error loading registrations:", err);
        container.innerHTML = "<p>Failed to load registrations.</p>";
    }
}
