import { db } from "../firebase/firebaseConfig";

export { app, auth, db, initAnalytics } from "../firebase/firebaseConfig";

export function requireFirestore() {
  return db;
}
