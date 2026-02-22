import { auth, db } from "./firebase.js";

import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let currentStudentName = "Student";
let cachedMentorId = null;
let cachedMentorName = null;
let cachedMentorEmail = null;

/* ================= MAIN ================= */

document.addEventListener("DOMContentLoaded", () => {

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "index.html";
    });
  }

  // Dashboard buttons -> routing
  const loadEventsBtn = document.getElementById("loadEventsBtn");
  if (loadEventsBtn) {
    loadEventsBtn.addEventListener("click", () => {
      window.location.href = "event.html";
    });
  }

  const dashboardBtn = document.getElementById("dashboardBtn");
  if (dashboardBtn) {
    dashboardBtn.addEventListener("click", () => {
      window.location.href = "student.html";
    });
  }

  onAuthStateChanged(auth, async (user) => {

    if (!user) {
      window.location.href = "index.html";
      return;
    }

    currentUser = user;

    const emailDisplay = document.getElementById("studentEmail");
    if (emailDisplay) emailDisplay.innerText = user.email;

    try {

      const studentSnap = await getDoc(doc(db, "users", user.uid));

      if (studentSnap.exists()) {
        currentStudentName = studentSnap.data().name || "Student";
      }

      const greetingDisplay = document.getElementById("headerGreeting");
      if (greetingDisplay && !greetingDisplay.innerText.includes("Events")) {
        greetingDisplay.innerText = `Welcome, ${currentStudentName}`;
      }

      await loadMentorInfo(user.uid);

      // CONDITIONAL RENDERING: Event Page vs Dashboard Info
      if (document.getElementById("eventsSection")) {
        await loadEvents();
      }

      if (document.getElementById("notificationsList")) {
        await loadNotifications();
      }

      // NEW: Dashboard live events rendering
      if (document.getElementById("dashboardEventsList")) {
        await loadDashboardEvents();
      }

    } catch (err) {
      console.error("Auth error:", err);
    }
  });

});

/* ================= STUDENT DASHBOARD: LOAD UPCOMING EVENTS ================= */
async function loadDashboardEvents() {
  const container = document.getElementById("dashboardEventsList");
  if (!container) return;

  container.innerHTML = "Loading events...";

  try {
    const snap = await getDocs(collection(db, "events"));
    container.innerHTML = "";

    if (snap.empty) {
      container.innerHTML = "<p>No events available.</p>";
      return;
    }

    const reqQuery = query(
      collection(db, "requests"),
      where("studentId", "==", currentUser.uid)
    );
    const reqSnap = await getDocs(reqQuery);
    const requestedEventIds = {};
    reqSnap.forEach(rDoc => {
      const rData = rDoc.data();
      if (rData.eventId && rData.status) {
        requestedEventIds[rData.eventId] = rData.status;
      }
    });

    snap.forEach((docSnap) => {
      const e = docSnap.data();
      const eventId = docSnap.id;
      const reqStatus = requestedEventIds[eventId];

      const div = document.createElement("div");
      div.className = "event-card";

      div.innerHTML = `
        <h4>${e.name || "Untitled Event"}</h4>
        <p><strong>Date:</strong> ${e.date || "N/A"}</p>
        <p><strong>Time:</strong> ${e.time || "N/A"}</p>
        <p><strong>Location:</strong> ${e.location || "N/A"}</p>
        <div style="margin-top: 10px; display: flex; gap: 8px;">
          <button onclick="openEventDetails('${eventId}')" 
                  style="background: #2563eb; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer;">
            Details
          </button>
          ${reqStatus === "pending"
          ? `<button style="background: #16a34a; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: not-allowed;" disabled>Pending Approval</button>`
          : reqStatus === "approved"
            ? `<button style="background: #16a34a; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: not-allowed;" disabled>Status: Approved ✅</button>`
            : reqStatus === "rejected"
              ? `<button style="background: #dc2626; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: not-allowed;" disabled>Status: Rejected ❌</button>`
              : `<button onclick="openPermissionModal('${eventId}')" style="background: #f59e0b; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer;">Request Permission</button>`
        }
        </div>
      `;

      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading events:", err);
    container.innerHTML = "<p>Failed to load events.</p>";
  }
}

/* ================= NOTIFICATIONS ================= */

async function loadNotifications() {
  const container = document.getElementById("notificationsList");
  if (!container) return;

  container.innerHTML = "Loading notifications...";

  try {
    const q = query(
      collection(db, "notifications"),
      where("studentId", "==", currentUser.uid)
    );
    const snap = await getDocs(q);
    container.innerHTML = "";

    if (snap.empty) {
      container.innerHTML = "<p>No recent notifications.</p>";
      return;
    }

    snap.forEach((docSnap) => {
      const n = docSnap.data();
      const card = document.createElement("div");
      card.className = "event-card";

      const dateDisplay = n.createdAt && n.createdAt.toDate
        ? n.createdAt.toDate().toLocaleString()
        : "Recent";

      const statusColor = n.status === "approved" ? "green"
        : (n.status === "rejected" ? "red" : "gray");

      card.innerHTML = `
        <p><strong>Message:</strong> ${n.message || "Notification"}</p>
        <p><strong>Status:</strong> <span style="color:${statusColor}; font-weight:bold;">${(n.status || "update").toUpperCase()}</span></p>
        <p><strong>Date:</strong> ${dateDisplay}</p>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    console.error("Error loading notifications:", e);
    container.innerHTML = "Failed to load notifications.";
  }
}

/* ================= LOAD MENTOR ================= */

async function loadMentorInfo(uid) {

  try {

    const studentSnap = await getDoc(doc(db, "users", uid));
    if (!studentSnap.exists()) return;

    const studentData = studentSnap.data();

    if (!studentData.mentorId) {
      const mnNameLine = document.getElementById("mentorNameLine");
      if (mnNameLine) mnNameLine.innerHTML = "<strong>Notice:</strong> No mentor assigned";
      return;
    }

    cachedMentorId = studentData.mentorId; // Cache mentorId

    const mentorSnap = await getDoc(
      doc(db, "users", studentData.mentorId)
    );

    if (!mentorSnap.exists()) return;

    const mentor = mentorSnap.data();
    cachedMentorName = mentor.name || "Unknown Mentor";
    cachedMentorEmail = mentor.email || "No Email";

    const nameLine = document.getElementById("mentorNameLine");
    if (nameLine) nameLine.innerHTML = "<strong>Name:</strong> " + cachedMentorName;

    const emailLine = document.getElementById("mentorEmailLine");
    if (emailLine) {
      emailLine.innerHTML = "<strong>Email:</strong> " + cachedMentorEmail;
      emailLine.style.display = "block";
    }

    const idLine = document.getElementById("mentorIdLine");
    if (idLine) {
      idLine.innerHTML = "<strong>Faculty ID:</strong> " + studentData.mentorId;
      idLine.style.display = "block";
    }

  } catch (error) {
    console.error("Mentor Load Error:", error);
  }
}
/* ================= LOAD EVENTS ================= */
async function loadEvents() {
  const container = document.getElementById("eventsList");
  const upcomingContainer = document.getElementById("upcomingEventsList");
  const completedContainer = document.getElementById("completedEventsList");

  if (document.getElementById("eventsSection")) {
    document.getElementById("eventsSection").style.display = "block";
  }

  if (upcomingContainer) upcomingContainer.innerHTML = "";
  if (completedContainer) completedContainer.innerHTML = "";
  if (container) container.innerHTML = ""; // Fallback

  const snap = await getDocs(collection(db, "events"));

  if (snap.empty) {
    if (upcomingContainer) upcomingContainer.innerHTML = "<p>No events available.</p>";
    if (completedContainer) completedContainer.innerHTML = "<p>No events available.</p>";
    if (container) container.innerHTML = "<p>No events available.</p>";
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // PRE-FETCH Registrations
  const regQuery = query(
    collection(db, "registrations"),
    where("studentId", "==", currentUser.uid)
  );
  const regSnap = await getDocs(regQuery);
  const registeredEventIds = {};
  regSnap.forEach(rDoc => {
    const rData = rDoc.data();
    if (rData.eventId) registeredEventIds[rData.eventId] = true;
  });

  // PRE-FETCH Requests
  const reqQuery = query(
    collection(db, "requests"),
    where("studentId", "==", currentUser.uid)
  );
  const reqSnap = await getDocs(reqQuery);
  const requestedEventIds = {};
  reqSnap.forEach(rDoc => {
    const rData = rDoc.data();
    if (rData.eventId && rData.status) {
      requestedEventIds[rData.eventId] = rData.status;
    }
  });
  snap.forEach(async (docSnap) => {
    const event = docSnap.data();
    const eventId = docSnap.id;

    if (!event.date) return;
    const eventDateObj = new Date(event.date);
    eventDateObj.setHours(0, 0, 0, 0);

    const isCompleted = eventDateObj < today;
    const isRegistered = registeredEventIds[eventId] === true;

    const card = document.createElement("div");
    card.className = "event-card";

    const reqStatus = requestedEventIds[eventId];

    let registerButtonHTML = "";
    if (!isCompleted) {
      if (isRegistered) {
        registerButtonHTML = `<button class="register-btn" style="background:#16a34a; color:white; cursor:not-allowed;" disabled>Already Registered</button>`;
      } else {
        registerButtonHTML = `<button class="register-btn">Register</button>`;
      }
    } else {
      registerButtonHTML = `<button class="register-btn" style="background:#9ca3af; cursor:not-allowed;" disabled>Event Completed</button>`;
    }

    let requestBtnHTML = "";
    if (!isCompleted) {
      if (reqStatus === "pending") {
        requestBtnHTML = `<button style="background:#16a34a; color:white; padding:6px 12px; border:none; border-radius:4px; cursor:not-allowed;" disabled>Pending Approval</button>`;
      } else if (reqStatus === "approved") {
        requestBtnHTML = `<button style="background:#16a34a; color:white; padding:6px 12px; border:none; border-radius:4px; cursor:not-allowed;" disabled>Status: Approved ✅</button>`;
      } else if (reqStatus === "rejected") {
        requestBtnHTML = `<button style="background:#dc2626; color:white; padding:6px 12px; border:none; border-radius:4px; cursor:not-allowed;" disabled>Status: Rejected ❌</button>`;
      } else {
        requestBtnHTML = `<button onclick="openPermissionModal('${eventId}')" style="background:#f59e0b; color:white; padding:6px 12px; border:none; border-radius:4px; cursor:pointer;">Request Permission</button>`;
      }
    }

    card.innerHTML = `
      <h4>${event.name || "Untitled Event"}</h4>
      <p><b>Date:</b> ${event.date}</p>
      <p><b>Time:</b> ${event.time}</p>
      <p><b>Location:</b> ${event.location}</p>
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button class="details-btn" onclick="openEventDetails('${eventId}')">Details</button>
        ${registerButtonHTML}
        ${requestBtnHTML}
      </div>
    `;

    /* REGISTER BUTTON (Interactive) */
    const registerActBtn = card.querySelector(".register-btn");
    if (registerActBtn && !isRegistered && !isCompleted) {
      registerActBtn.onclick = async () => {
        await registerForEvent(eventId, event);
      };
    }

    if (upcomingContainer && !isCompleted) upcomingContainer.appendChild(card);
    else if (completedContainer && isCompleted) completedContainer.appendChild(card);
    else if (container) container.appendChild(card); // fallback scope

  });
}

/* ================= REGISTER ================= */

async function registerForEvent(eventId, eventData) {

  if (!currentUser) return;

  try {

    // Double check database strictly
    const q = query(
      collection(db, "registrations"),
      where("eventId", "==", eventId),
      where("studentId", "==", currentUser.uid)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      alert("You are already registered for this event.");
      return;
    }

    // Flat Structure Insertion
    await addDoc(collection(db, "registrations"), {
      eventId: eventId,
      eventName: eventData.name || "Unknown Event",
      studentId: currentUser.uid,
      studentName: currentStudentName,
      studentEmail: currentUser.email,
      mentorId: cachedMentorId || null,
      mentorName: cachedMentorName || null,
      mentorEmail: cachedMentorEmail || null,
      status: "pending",
      createdAt: serverTimestamp()
    });

    alert("Registration successful!");

    // Refresh to update buttons natively to "Already Registered"
    await loadEvents();

  } catch (error) {
    console.error("Registration Error:", error);
    alert(error.message);
  }
}

/* ================= REQUEST LETTER FORMAT ================= */

function generateRequestLetter(eventId, eventData) {
  // Deprecated: No longer showing fixed format letter on register
}

window.openPermissionModal = function (eventId) {
  const bodyHtml = `
    <textarea id="customLetterTextarea" rows="6" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px; font-family:inherit;" placeholder="Write your permission letter here..."></textarea>
    <div style="margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
      <button onclick="closeEventModal()" style="background: #6b7280; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
      <button id="submitCustomLetterBtn" style="background: #2563eb; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Submit</button>
    </div>
  `;
  window.showModal("Request Permission", bodyHtml);

  const submitBtn = document.getElementById("submitCustomLetterBtn");
  if (submitBtn) {
    submitBtn.onclick = async () => {
      const content = document.getElementById("customLetterTextarea").value.trim();
      if (!content) {
        alert("Please write your permission letter before submitting.");
        return;
      }
      submitBtn.innerText = "Submitting...";
      submitBtn.disabled = true;
      try {
        await addDoc(collection(db, "requests"), {
          studentId: currentUser.uid,
          eventId: eventId,
          mentorId: cachedMentorId || null,
          letterContent: content,
          status: "pending",
          createdAt: serverTimestamp()
        });
        alert("Permission request submitted successfully.");
        window.closeEventModal();
        if (document.getElementById("dashboardEventsList")) {
          loadDashboardEvents();
        }
        if (document.getElementById("eventsList") || document.getElementById("upcomingEventsList")) {
          loadEvents();
        }
      } catch (err) {
        console.error("Error submitting letter:", err);
        alert("Failed to submit request.");
        submitBtn.innerText = "Submit";
        submitBtn.disabled = false;
      }
    };
  }
}

/* ================= MODAL CLOSE ================= */

window.showModal = function (title, bodyHtml) {
  const titleEl = document.getElementById("eventModalTitle");
  const bodyEl = document.getElementById("eventModalBody");
  const backdrop = document.getElementById("eventModalBackdrop");
  if (titleEl && bodyEl && backdrop) {
    titleEl.innerText = title;
    bodyEl.innerHTML = bodyHtml;
    backdrop.style.display = "flex";
  }
};

window.closeEventModal = function () {
  const backdrop = document.getElementById("eventModalBackdrop");
  if (backdrop) backdrop.style.display = "none";
};

window.openEventDetails = async (eventId) => {
  try {
    const snap = await getDoc(doc(db, "events", eventId));
    if (!snap.exists()) {
      alert("Event not found");
      return;
    }
    const e = snap.data();
    const body = `
      <p><b>Name:</b> ${e.name || ""}</p>
      <p><b>Date:</b> ${e.date || ""}</p>
      <p><b>Time:</b> ${e.time || ""}</p>
      <p><b>Location:</b> ${e.location || ""}</p>
      <p><b>Status:</b> ${e.status || ""}</p>
      <p><b>About:</b></p>
      <p style="white-space: pre-wrap;">${e.about || "—"}</p>
      <p><b>Created At:</b> ${e.createdAt ? e.createdAt.toDate() : ""}</p>
    `;
    window.showModal("Event Details", body);
  } catch (err) {
    console.error("Error loading event details:", err);
    alert("Failed to load event details.");
  }
};