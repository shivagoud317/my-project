import { auth, db } from "./firebase.js";
import {
  doc, getDoc, setDoc, getDocs, collection
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");

const eventRef = doc(db, "events", eventId);
const eventSnap = await getDoc(eventRef);

document.getElementById("eventName").innerText = eventSnap.data().name;
document.getElementById("eventInfo").innerText =
  `${eventSnap.data().date} | ${eventSnap.data().location}`;

/* REGISTER */
document.getElementById("registerBtn").onclick = async () => {
  const uid = auth.currentUser.uid;

  await setDoc(
    doc(db, "registrations", eventId, "students", uid),
    { registeredAt: new Date() }
  );

  alert("Registered");
};

/* VIEW REGISTERED */
document.getElementById("registeredBtn").onclick = async () => {
  const out = document.getElementById("output");
  out.innerHTML = "";

  const snap = await getDocs(
    collection(db, "registrations", eventId, "students")
  );

  snap.forEach(d => {
    out.innerHTML += `<p>${d.id}</p>`;
  });
};

/* ATTENDANCE (Faculty/Admin) */
document.getElementById("attendanceBtn").onclick = async () => {
  const uid = auth.currentUser.uid;

  await setDoc(
    doc(db, "attendance", eventId, "students", uid),
    { present: true }
  );

  alert("Attendance marked");
};
