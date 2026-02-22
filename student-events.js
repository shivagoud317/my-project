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

    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get("studentId");

    if (studentId) {
        loadStudentInfo(studentId);
        loadStudentEvents(studentId);
    } else {
        document.getElementById("studentEventsList").innerHTML = "<p>No student specified.</p>";
    }
});

async function loadStudentInfo(studentId) {
    try {
        const docRef = doc(db, "users", studentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const student = docSnap.data();
            const titleEl = document.getElementById("studentEventsTitle");
            if (titleEl) {
                titleEl.textContent = `Events for ${student.name || "Student"}`;
            }
        }
    } catch (err) {
        console.error("Error loading student info", err);
    }
}

async function loadStudentEvents(studentId) {
    const container = document.getElementById("studentEventsList");
    if (!container) return;

    container.innerHTML = "Loading events...";

    try {
        const q = query(
            collection(db, "registrations"),
            where("studentId", "==", studentId)
        );

        const snap = await getDocs(q);
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = "<p>No events found for this student.</p>";
            return;
        }

        snap.forEach(async (docSnap) => {
            const regParams = docSnap.data();
            const status = (regParams.attendanceStatus || "pending").toLowerCase();
            let badgeColor = "gray";
            if (status === "present") badgeColor = "green";
            else if (status === "absent") badgeColor = "red";
            else if (status === "pending") badgeColor = "orange";

            let eventDateMatch = "Unknown Date";

            try {
                // Look up specific event date optionally
                const eventDoc = await getDoc(doc(db, "events", regParams.eventId));
                if (eventDoc.exists()) {
                    eventDateMatch = eventDoc.data().date || "Unknown Date";
                }
            } catch (e) { }

            const div = document.createElement("div");
            div.className = "event-card";

            div.innerHTML = `
        <h4>${regParams.eventName || "Unknown Event"}</h4>
        <p><strong>Date:</strong> ${eventDateMatch}</p>
        <p style="margin-top: 10px;">
          <strong>Attendance:</strong> 
          <span style="background: ${badgeColor}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
            ${status.toUpperCase()}
          </span>
        </p>
      `;

            container.appendChild(div);
        });
    } catch (error) {
        console.error("Error loading events:", error);
        container.innerHTML = "<p>Failed to load events.</p>";
    }
}
