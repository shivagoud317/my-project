import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===============================
   AUTH CHECK
================================ */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  loadEvents();
});

/* ===============================
   LOAD EVENTS
================================ */
async function loadEvents() {
  const container = document.getElementById("eventsContainer");
  const emptyMsg = document.getElementById("emptyMsg");

  container.innerHTML = "";

  try {
    const snap = await getDocs(collection(db, "events"));

    if (snap.empty) {
      emptyMsg.style.display = "block";
      return;
    }

    emptyMsg.style.display = "none";

    snap.forEach(docSnap => {
      const e = docSnap.data();

      const div = document.createElement("div");
      div.className = "event-card";

      div.innerHTML = `
        <h3>${e.name}</h3>
        <p><b>Date:</b> ${e.date}</p>
        <p><b>Time:</b> ${e.time}</p>
        <p><b>Location:</b> ${e.location}</p>
        <span class="status ${e.status}">
          ${e.status.toUpperCase()}
        </span>
      `;

      container.appendChild(div);
    });

  } catch (err) {
    console.error("Error loading events:", err);
    alert("Failed to load events");
  }
}
