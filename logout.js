import { auth } from "./firebase.js";
import { signOut } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

window.logout = async function () {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (err) {
    alert(err.message);
  }
};
