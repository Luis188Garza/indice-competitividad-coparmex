import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD91PNYWXuy5rfhkLKUgVSWmDya3kzHWpQ",
  authDomain: "coparmex-ice.firebaseapp.com",
  projectId: "coparmex-ice",
  storageBucket: "coparmex-ice.firebasestorage.app",
  messagingSenderId: "143398068980",
  appId: "1:143398068980:web:c50c8c235d9885d78874a1",
  measurementId: "G-CY0QR529Q8",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const initAnalytics = async () => {
  if (typeof window === "undefined") return null;

  const supported = await isSupported();
  if (!supported) return null;

  return getAnalytics(app);
};
