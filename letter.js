import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentRequestId = null;
let currentRequestData = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Parse requestId from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  currentRequestId = urlParams.get('requestId');

  if (!currentRequestId) {
    alert("No request ID provided.");
    window.location.href = "pending.html";
    return;
  }

  await loadRequestDetails();
});

async function loadRequestDetails() {
  try {
    console.log("Loading request:", currentRequestId);
    const reqSnap = await getDoc(doc(db, "requests", currentRequestId));

    if (!reqSnap.exists()) {
      document.getElementById("loadingStatus").innerText = "Request not found.";
      return;
    }

    currentRequestData = reqSnap.data();

    // Fetch Student Name
    let studentName = "Unknown Student";
    let studentEmail = "Unknown Email";
    if (currentRequestData.studentId) {
      try {
        const userSnap = await getDoc(doc(db, "users", currentRequestData.studentId));
        if (userSnap.exists()) {
          studentName = userSnap.data().name || "Unknown Student";
          studentEmail = userSnap.data().email || "Unknown Email";
        }
      } catch (e) { }
    }

    currentRequestData.studentName = studentName; // Cache for later use
    currentRequestData.studentEmail = studentEmail; // Cache for later use

    // Fetch Event Name
    let eventName = "Unknown Event";
    if (currentRequestData.eventId) {
      try {
        const eventSnap = await getDoc(doc(db, "events", currentRequestData.eventId));
        if (eventSnap.exists()) eventName = eventSnap.data().name || "Unknown Event";
      } catch (e) { }
    }

    currentRequestData.eventName = eventName; // Cache for later use

    // Update UI
    document.getElementById("loadingStatus").style.display = "none";
    document.getElementById("requestDetails").style.display = "block";

    document.getElementById("eventNameDisplay").innerText = eventName;
    document.getElementById("studentNameDisplay").innerText = studentName;
    document.getElementById("letterContentDisplay").innerText = currentRequestData.letterContent || "No letter provided.";

    // Disable buttons if already approved/rejected
    if (currentRequestData.status !== "pending") {
      const statusDisplay = document.getElementById("statusDisplay");
      statusDisplay.innerText = currentRequestData.status.toUpperCase();
      statusDisplay.style.color = currentRequestData.status === "approved" ? "green" : "red";

      document.getElementById("approveBtn").style.display = "none";
      document.getElementById("rejectBtn").style.display = "none";
    }

  } catch (err) {
    console.error("Error loading request details:", err);
    document.getElementById("loadingStatus").innerText = "Failed to load request details.";
  }
}

document.getElementById("approveBtn")?.addEventListener("click", async () => {
  await handleAction("approved");
});

document.getElementById("rejectBtn")?.addEventListener("click", async () => {
  await handleAction("rejected");
});

async function handleAction(newStatus) {
  if (!currentRequestId || !currentRequestData) return;

  const approveBtn = document.getElementById("approveBtn");
  const rejectBtn = document.getElementById("rejectBtn");

  if (approveBtn) approveBtn.disabled = true;
  if (rejectBtn) rejectBtn.disabled = true;

  try {
    // 1. Update the request status
    await updateDoc(doc(db, "requests", currentRequestId), {
      status: newStatus,
      updatedAt: serverTimestamp()
    });

    // 2. Create notification for student
    const messageText = newStatus === "approved"
      ? "Your permission request has been Approved"
      : "Your permission request has been Rejected";

    await addDoc(collection(db, "notifications"), {
      studentId: currentRequestData.studentId,
      eventId: currentRequestData.eventId,
      message: messageText,
      status: newStatus,
      createdAt: serverTimestamp()
    });

    // 3. Update related registration (if exists)
    try {
      const regQuery = query(
        collection(db, "registrations"),
        where("eventId", "==", currentRequestData.eventId),
        where("studentId", "==", currentRequestData.studentId)
      );
      const regSnap = await getDocs(regQuery);
      if (!regSnap.empty) {
        for (const regDoc of regSnap.docs) {
          await updateDoc(doc(db, "registrations", regDoc.id), {
            status: newStatus,
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (e) {
      console.error("Error updating registration:", e);
    }

    // Exact required success message
    const successMsg = newStatus === "approved" ? "Approved Successfully!" : "Rejected Successfully!";
    alert(successMsg);

  } catch (err) {
    console.error(`Error updating request to ${newStatus}:`, err);
    alert(`Failed to do action`);

    if (approveBtn) approveBtn.disabled = false;
    if (rejectBtn) rejectBtn.disabled = false;
    return;
  }

  window.location.href = "pending.html";
}
