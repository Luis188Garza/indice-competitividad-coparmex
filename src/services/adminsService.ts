import { doc, getDoc } from "firebase/firestore";
import { requireFirestore } from "./firebase";

export type AdminUserRecord = {
  id: string;
  name?: string;
  email?: string;
  role?: "admin" | "superadmin";
  active?: boolean;
};

export async function getAdminByUid(uid: string) {
  const firestore = requireFirestore();
  const snapshot = await getDoc(doc(firestore, "admins", uid));
  if (!snapshot.exists()) return null;
  return { ...snapshot.data(), id: snapshot.id } as AdminUserRecord;
}
