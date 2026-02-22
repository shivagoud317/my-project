import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
  query,
  where,
  collectionGroup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const cancelEvent = async (eventId) => {
  if (!confirm("Cancel this event?")) return;
  try {
    await updateDoc(doc(db, "events", eventId), { status: "cancelled" });
    loadEvents();
    loadDashboardCounts();
  } catch (err) {
    alert(err.message);
  }
};
window.cancelEvent = cancelEvent;

const deleteEvent = async (eventId) => {
  if (!confirm("Are you sure you want to delete this event?")) return;
  try {
    await deleteDoc(doc(db, "events", eventId));
    loadEvents();
    loadDashboardCounts();
  } catch (err) {
    alert(err.message);
  }
};
window.deleteEvent = deleteEvent;

/* ================= AUTH CHECK ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("adminEmail").innerText = user.email;

  const greetingEl = document.getElementById("greeting");
  if (greetingEl) {
    greetingEl.innerText = "Welcome, " + user.email.split("@")[0];
  }

  // Fetch admin name from users collection
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const uData = userDoc.data();
      if (uData.name && greetingEl) {
        greetingEl.innerText = "Welcome, " + uData.name;
      }
    }
  } catch (err) {
    console.error("Error fetching admin name:", err);
  }

  loadDashboardCounts();
  loadEvents();
});

/* ================= DASHBOARD COUNTS ================= */
async function loadDashboardCounts() {
  const snap = await getDocs(collection(db, "events"));

  let total = snap.size;
  let upcoming = 0, completed = 0, cancelled = 0;

  snap.forEach(doc => {
    const s = doc.data().status;
    if (s === "upcoming") upcoming++;
    else if (s === "completed") completed++;
    else if (s === "cancelled") cancelled++;
  });

  document.getElementById("totalEvents").innerText = total;
  document.getElementById("upcomingEvents").innerText = upcoming;
  document.getElementById("completedEvents").innerText = completed;
  document.getElementById("cancelledEvents").innerText = cancelled;
}

/* ================= CREATE EVENT ================= */
document.getElementById("createEventBtn").addEventListener("click", async () => {
  try {
    const name = document.getElementById("eventName").value.trim();
    const date = document.getElementById("eventDate").value;
    const time = document.getElementById("eventTime").value;
    const location = document.getElementById("eventLocation").value.trim();
    const about = document.getElementById("eventAbout")
      ? document.getElementById("eventAbout").value.trim()
      : "";

    // ✅ Validation (no prompts)
    if (!name || !date || !time || !location || !about) {
      alert("Please fill all fields, including About Event, before creating event");
      return;
    }

    await addDoc(collection(db, "events"), {
      name,
      date,
      time,
      location,
      about,
      status: "upcoming",
      createdAt: serverTimestamp()
    });

    alert("✅ Event created successfully");

    // ✅ Clear form after creation
    document.getElementById("eventName").value = "";
    document.getElementById("eventDate").value = "";
    document.getElementById("eventTime").value = "";
    document.getElementById("eventLocation").value = "";
    if (document.getElementById("eventAbout")) {
      document.getElementById("eventAbout").value = "";
    }

    loadDashboardCounts();
    loadEvents();

  } catch (error) {
    console.error("Event creation error:", error);
    alert(error.message);
  }
});


/* ================= LOAD EVENTS ================= */
async function loadEvents() {
  const container = document.getElementById("eventsList");
  container.innerHTML = "";

  const snap = await getDocs(collection(db, "events"));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  snap.forEach(async (docSnap) => {
    const e = docSnap.data();

    const eventDate = new Date(e.date);
    eventDate.setHours(0, 0, 0, 0);

    // 🔥 AUTO STATUS BASED ON DATE
    let computedStatus = e.status;
    if (e.status !== "cancelled") {
      computedStatus =
        eventDate < today ? "completed" : "upcoming";
    }

    // 🔁 OPTIONAL: update Firestore automatically
    if (e.status !== computedStatus) {
      await updateDoc(doc(db, "events", docSnap.id), {
        status: computedStatus
      });
    }

    const div = document.createElement("div");
    div.className = "event-card";

    div.innerHTML = `
      <h3>${e.name}</h3>
      <p><b>Date:</b> ${e.date}</p>
      <p><b>Time:</b> ${e.time}</p>
      <p><b>Location:</b> ${e.location}</p>
      <p><b>Status:</b>
        <span class="status ${computedStatus}">
          ${computedStatus.toUpperCase()}
        </span>
      </p>
      <div class="event-footer">
        <button onclick="openEventDetails('${docSnap.id}')">Details</button>
        <button onclick="openEventRegistrations('${docSnap.id}')">Registrations</button>
        ${computedStatus === "upcoming"
        ? `<button onclick="cancelEvent('${docSnap.id}')">Cancel</button>`
        : ""
      }
        <button onclick="deleteEvent('${docSnap.id}')">Delete</button>
      </div>
    `;

    container.appendChild(div);
  });
}

/* (Removed REGISTRATIONS TABLE (MASTER VIEW)) */

/* ================= EVENT MODAL HELPERS ================= */
const modalBackdrop = document.getElementById("eventModalBackdrop");
const modalTitle = document.getElementById("eventModalTitle");
const modalBody = document.getElementById("eventModalBody");

function showModal(title, bodyHtml) {
  if (!modalBackdrop || !modalTitle || !modalBody) return;
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modalBackdrop.style.display = "flex";
}

window.closeEventModal = () => {
  if (modalBackdrop) {
    modalBackdrop.style.display = "none";
  }
};

/* ================= EVENT DETAILS ACTION ================= */
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
    showModal("Event Details", body);
  } catch (err) {
    console.error("Error loading event details:", err);
    alert("Failed to load event details.");
  }
};

/* ================= EVENT REGISTRATIONS ACTION ================= */
window.openEventRegistrations = (eventId) => {
  window.location.href = `registration.html?eventId=${eventId}`;
};


/* ================= NAVIGATION ================= */
window.goToEvents = () => {
  window.location.href = "events.html";
};

/* ================= LOGOUT ================= */
window.logout = async () => {
  await signOut(auth);
  window.location.href = "index.html";
};
