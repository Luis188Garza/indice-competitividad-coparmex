import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updatePassword, type User } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";

export function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function registerWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function sendRecoveryEmail(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export function logout() {
  return signOut(auth);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function listenAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function changeCurrentUserPassword(newPassword: string) {
  if (!auth.currentUser) {
    throw new Error("No hay una sesión activa.");
  }

  await updatePassword(auth.currentUser, newPassword);
}
