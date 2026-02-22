import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }
    loadPendingRegistrations(user.uid);
});

async function loadPendingRegistrations(mentorId) {

    const container = document.getElementById("pendingRegistrationsList");
    if (!container) return;

    container.innerHTML = "Loading pending registrations...";

    try {
        const q = query(
            collection(db, "requests"),
            where("mentorId", "==", mentorId),
            where("status", "==", "pending")
        );

        const snap = await getDocs(q);
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = "<p>No pending student requests.</p>";
            return;
        }

        for (const docSnap of snap.docs) {

            const data = docSnap.data();
            const id = docSnap.id;

            // Fetch Student Details
            let finalStudentName = data.studentName || "Unknown Student";
            let finalStudentEmail = data.studentEmail || "Unknown Email";
            if (data.studentId) {
                try {
                    const studentSnap = await getDoc(doc(db, "users", data.studentId));
                    if (studentSnap.exists()) {
                        finalStudentName = studentSnap.data().name || finalStudentName;
                        finalStudentEmail = studentSnap.data().email || finalStudentEmail;
                    }
                } catch (e) { console.error(e); }
            }

            // Fetch Event Details
            let finalEventName = data.eventName || "Unknown Event";
            if (data.eventId) {
                try {
                    const eventSnap = await getDoc(doc(db, "events", data.eventId));
                    if (eventSnap.exists()) {
                        finalEventName = eventSnap.data().name || finalEventName;
                    }
                } catch (e) { console.error(e); }
            }

            const card = document.createElement("button");
            card.className = "event-card";
            card.style.display = "block";
            card.style.width = "100%";
            card.style.textAlign = "left";

            card.onclick = () => {
                window.location.href = `letter.html?requestId=${id}`;
            };

            card.innerHTML = `
                <h4>${finalEventName}</h4>
                <p><strong>Student:</strong> ${finalStudentName}</p>
                <p><strong>Email:</strong> ${finalStudentEmail}</p>
                <p><strong>Status:</strong> Pending</p>
            `;

            container.appendChild(card);
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = "<p>Failed to load requests.</p>";
    }
}

/* ================= APPROVE ================= */

window.approve = async (requestId) => {

    try {

        const reqRef = doc(db, "requests", requestId);
        const snap = await getDoc(reqRef);

        if (!snap.exists()) {
            alert("Request not found");
            return;
        }

        if (snap.data().status !== "pending") {
            alert("Already processed.");
            return;
        }

        await updateDoc(reqRef, {
            status: "approved",
            updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, "notifications"), {
            studentId: snap.data().studentId,
            eventId: snap.data().eventId,
            message: `Your permission request for ${snap.data().eventName} has been approved.`,
            status: "approved",
            createdAt: serverTimestamp()
        });

        alert("Approved Successfully!");
        window.location.reload();

    } catch (err) {
        console.error(err);
        alert("Failed to do action");
    }
};

/* ================= REJECT ================= */

window.reject = async (requestId) => {

    try {

        const reqRef = doc(db, "requests", requestId);
        const snap = await getDoc(reqRef);

        if (!snap.exists()) {
            alert("Request not found");
            return;
        }

        if (snap.data().status !== "pending") {
            alert("Already processed.");
            return;
        }

        await updateDoc(reqRef, {
            status: "rejected",
            updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, "notifications"), {
            studentId: snap.data().studentId,
            eventId: snap.data().eventId,
            message: `Your permission request for ${snap.data().eventName} has been rejected.`,
            status: "rejected",
            createdAt: serverTimestamp()
        });

        alert("Rejected Successfully!");
        window.location.reload();

    } catch (err) {
        console.error(err);
        alert("Failed to do action");
    }
};