import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { requireFirestore } from "./firebase";

export type InstitutionalSettingsData = {
  presidentLetter?: {
    title: string;
    presidentName: string;
    presidentRole: string;
    body: string;
  };
  specializedEvaluationEmail?: {
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    body: string;
  };
};

const settingsRef = () => doc(requireFirestore(), "platformSettings", "institutional");

export async function getInstitutionalSettings() {
  const snapshot = await getDoc(settingsRef());
  return snapshot.exists() ? snapshot.data() as InstitutionalSettingsData : null;
}

export async function saveInstitutionalSettings(data: InstitutionalSettingsData) {
  await setDoc(settingsRef(), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
