import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot,
  collectionGroup,
  addDoc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const requestsList = document.getElementById("requestsList");
const facultyEmail = document.getElementById("facultyEmail");

let currentFacultyUid = null;

/* ================= AUTH ================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentFacultyUid = user.uid;

  if (facultyEmail) facultyEmail.textContent = user.email;
  const greetingEl = document.getElementById("greeting");
  if (greetingEl) greetingEl.textContent = "Welcome, " + (user.email || "").split("@")[0];

  loadEvents();
  // Existing features intact
  if (requestsList) loadRequests(user.email);

  // Day-of Event notification banner check
  loadTodayAttendance(user.uid);
});

/* ================= LOAD EVENTS ================= */

async function loadEvents() {
  if (!eventsList) return;

  eventsList.innerHTML = "Loading events...";

  try {
    const snap = await getDocs(collection(db, "events"));
    eventsList.innerHTML = "";

    if (snap.empty) {
      eventsList.innerHTML = "<p>No events available.</p>";
      return;
    }

    snap.forEach((docSnap) => {
      const e = docSnap.data();

      const div = document.createElement("div");
      div.className = "event-card";

      div.innerHTML = `
        <h4>${e.name}</h4>
        <p>Date: ${e.date}</p>
        <p>Time: ${e.time}</p>
        <p>Location: ${e.location}</p>
      `;

      eventsList.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    eventsList.innerHTML = "Failed to load events.";
  }
}

/* (Removed LOAD REGISTRATIONS) */

/* ================= APPROVE & REJECT ================= */

window.approve = async (idOrEventId, studentId) => {
  try {
    if (studentId) {
      // Legacy behavior (subcollections / permission desk)
      const regRef = doc(db, "registrations", idOrEventId, "students", studentId);
      await updateDoc(regRef, {
        status: "approved"
      });
      if (auth.currentUser) loadRequests(auth.currentUser.email);
    } else {
      // New behavior (flat registrations via UI)
      await updateDoc(doc(db, "registrations", idOrEventId), {
        status: "approved",
        updatedAt: serverTimestamp()
      });
      // Will be reloaded on the specific page if needed
      window.location.reload();
    }
    alert("Approved!");
  } catch (err) {
    console.error(err);
    alert("Failed to approve.");
  }
};

window.reject = async (idOrEventId, studentId) => {
  try {
    if (studentId) {
      // Legacy behavior (subcollections / permission desk)
      const regRef = doc(db, "registrations", idOrEventId, "students", studentId);
      await updateDoc(regRef, {
        status: "rejected"
      });
      if (auth.currentUser) loadRequests(auth.currentUser.email);
    } else {
      // New behavior (flat registrations via UI)
      await updateDoc(doc(db, "registrations", idOrEventId), {
        status: "rejected",
        updatedAt: serverTimestamp()
      });
      // Will be reloaded on the specific page if needed
      window.location.reload();
    }
    alert("Rejected!");
  } catch (err) {
    console.error(err);
    alert("Failed to reject.");
  }
};

/* ================= EXISTING FUNCTIONS (Restored) ================= */

/* ---------- LOAD PERMISSION REQUESTS (from permission_requests) ---------- */
async function loadRequests(mentorEmail) {
  if (!requestsList) return;
  requestsList.innerHTML = "Loading...";

  try {
    const q = query(
      collectionGroup(db, "students"),
      where("facultyEmail", "==", mentorEmail),
      where("requestType", "==", "permission")
    );
    const snapshot = await getDocs(q);
    requestsList.innerHTML = "";

    const docs = [];
    snapshot.forEach((docSnap) => {
      if (!docSnap.ref.path.startsWith("permission_requests/")) return;
      docs.push(docSnap);
    });

    if (docs.length === 0) {
      requestsList.innerHTML = "<p>No permission requests found.</p>";
      return;
    }

    for (const docSnap of docs) {
      const data = docSnap.data();
      const eventId = docSnap.ref.parent.parent?.id || data.eventId || "";
      const studentId = docSnap.id;

      let status = "pending";
      try {
        const regSnap = await getDoc(doc(db, "registrations", eventId, "students", studentId));
        if (regSnap.exists()) {
          status = (regSnap.data().status || "pending").toLowerCase();
        }
      } catch (err) { }

      const div = document.createElement("div");
      div.className = "event-card";

      div.innerHTML = `
        <h4>${data.eventName || "Event"}</h4>
        <p><strong>Student:</strong> ${data.studentName || data.studentId}</p>
        <p class="letter-body">${data.reason || ""}</p>
        <div class="event-footer">
          <span class="status-chip ${status}">
            ${status.toUpperCase()}
          </span>
          ${status === "pending"
          ? `
                  <div>
                    <button onclick="approve('${eventId}', '${studentId}')">Accept</button>
                    <button onclick="reject('${eventId}', '${studentId}')">Reject</button>
                  </div>
                `
          : `<span class="status-note">Already ${status}</span>`
        }
        </div>
      `;

      requestsList.appendChild(div);
    }
  } catch (err) {
    console.error(err);
    requestsList.innerHTML = "Error loading permission requests";
  }
}

/* (Removed LOAD MENTEES, LIVE ATTENDANCE, REAL-TIME NOTIFICATIONS) */

/* ================= LOGOUT ================= */
window.logout = async () => {
  await signOut(auth);
  window.location.href = "index.html";
};

window.goToEvents = () => {
  window.location.href = "events.html";
};

/* ================= FACULTY: EVENT DAY ATTENDANCE ================= */
async function loadTodayAttendance(mentorId) {
  const container = document.getElementById("todayAttendanceList");
  if (!container) return;

  container.innerHTML = "Checking for today's events...";

  try {
    const today = new Date().toISOString().split('T')[0];

    const eventsSnap = await getDocs(collection(db, "events"));
    const todayEvents = {};
    eventsSnap.forEach(doc => {
      const e = doc.data();
      if (e.date === today) {
        todayEvents[doc.id] = e.name || "Untitled Event";
      }
    });

    if (Object.keys(todayEvents).length === 0) {
      container.innerHTML = "<p>No events scheduled for today.</p>";
      return;
    }

    let alertMsg = "Attendance required for: <br>";
    Object.values(todayEvents).forEach(name => alertMsg += "• " + name + "<br>");

    const banner = document.createElement("div");
    banner.style = "background: #fef08a; padding: 15px; margin-bottom: 20px; border-left: 5px solid #ca8a04; color: #854d0e; font-size: 1.1rem;";
    banner.innerHTML = alertMsg;

    const regQuery = query(
      collection(db, "registrations"),
      where("mentorId", "==", mentorId),
      where("status", "==", "approved")
    );

    const regSnap = await getDocs(regQuery);

    container.innerHTML = "";
    container.appendChild(banner);

    let hasStudents = false;

    regSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (todayEvents[data.eventId]) {
        hasStudents = true;
        const card = document.createElement("div");
        card.className = "event-card";

        let buttonsHTML = "";

        if (data.attendanceStatus) {
          buttonsHTML = `
             <span style="background: ${data.attendanceStatus === 'Present' ? '#16a34a' : '#ef4444'}; color: white; border-radius: 4px; padding: 4px 8px; font-weight: bold; font-size: 14px;">
               ${data.attendanceStatus.toUpperCase()}
             </span>
           `;
        } else {
          buttonsHTML = `
             <button onclick="markStudentAttendance('${docSnap.id}', '${data.studentId}', '${data.eventName}', 'Present', this)" 
                     style="background: #16a34a; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer;">
               Mark Present
             </button>
             <button onclick="markStudentAttendance('${docSnap.id}', '${data.studentId}', '${data.eventName}', 'Absent', this)" 
                     style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer;">
               Mark Absent
             </button>
           `;
        }

        card.innerHTML = `
          <h4>${data.eventName}</h4>
          <p><strong>Student:</strong> ${data.studentName}</p>
          <div style="margin-top: 15px; display: flex; gap: 10px;">
            ${buttonsHTML}
          </div>
        `;
        container.appendChild(card);
      }
    });

    if (!hasStudents) {
      container.innerHTML += "<p>You have no approved students attending today's events.</p>";
    }

  } catch (err) {
    console.error("Error loading attendance:", err);
    container.innerHTML = "<p>Failed to load attendance.</p>";
  }
}

/* ================= FACULTY: SUBMIT ATTENDANCE NOTIFICATION ================= */
window.markStudentAttendance = async (registrationId, studentId, eventName, status, buttonEl) => {
  try {
    const regRef = doc(db, "registrations", registrationId);

    // Check if attendance is already marked
    const regSnap = await getDoc(regRef);
    if (regSnap.exists() && regSnap.data().attendanceStatus) {
      alert("Attendance already submitted for this student.");
      return;
    }

    // Update attendance
    await updateDoc(regRef, {
      attendanceStatus: status,
      updatedAt: serverTimestamp()
    });

    await addDoc(collection(db, "notifications"), {
      studentId: studentId,
      message: `You were marked ${status} for ${eventName}`,
      status: "info",
      createdAt: serverTimestamp()
    });

    // Update UI dynamically to clear buttons and show label
    if (buttonEl) {
      const parentDiv = buttonEl.parentElement;
      parentDiv.innerHTML = `
             <span style="background: ${status === 'Present' ? '#16a34a' : '#ef4444'}; color: white; border-radius: 4px; padding: 4px 8px; font-weight: bold; font-size: 14px;">
               ${status.toUpperCase()}
             </span>
        `;
    } else {
      alert(`Successfully marked student as ${status}.`);
    }

  } catch (err) {
    console.error("Failed to mark attendance:", err);
    alert("Failed to submit attendance.");
  }
};