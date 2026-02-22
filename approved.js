import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }
    loadApprovedRegistrations(user.uid);
});

async function loadApprovedRegistrations(mentorId) {

    const container = document.getElementById("approvedRegistrationsList");
    if (!container) return;

    container.innerHTML = "Loading approved registrations...";

    try {

        const q = query(
            collection(db, "requests"),
            where("mentorId", "==", mentorId),
            where("status", "==", "approved")
        );

        const snap = await getDocs(q);
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = "<p>No approved requests.</p>";
            return;
        }

        for (const docSnap of snap.docs) {

            const data = docSnap.data();

            /* ===== GET STUDENT ===== */
            let studentName = "Student";
            let studentEmail = "Email";

            if (data.studentId) {
                const userSnap = await getDoc(doc(db, "users", data.studentId));
                if (userSnap.exists()) {
                    studentName = userSnap.data().name || "Student";
                    studentEmail = userSnap.data().email || "Email";
                }
            }

            /* ===== GET EVENT ===== */
            let eventName = "Event";

            if (data.eventId) {
                const eventSnap = await getDoc(doc(db, "events", data.eventId));
                if (eventSnap.exists()) {
                    eventName = eventSnap.data().name || "Event";
                }
            }

            const card = document.createElement("div");
            card.className = "event-card";

            card.innerHTML = `
                <h4>${eventName}</h4>
                <p><strong>Student:</strong> ${studentName}</p>
                <p><strong>Email:</strong> ${studentEmail}</p>
                <span style="background:green;color:white;padding:4px 8px;border-radius:4px;">
                    APPROVED
                </span>
            `;

            container.appendChild(card);
        }

    } catch (err) {
        console.error("FULL ERROR:", err);
        alert(err.message);
    }
}