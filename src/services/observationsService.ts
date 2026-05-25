import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { requireFirestore } from "./firebase";

export type ObservationData = {
  companyId: string;
  companyName: string;
  author: string;
  authorRole: "admin" | "company";
  text: string;
};

export type ObservationRecord = ObservationData & {
  id: string;
  createdAt?: unknown;
};

export async function createObservation(data: ObservationData) {
  const firestore = requireFirestore();
  const ref = await addDoc(collection(firestore, "observations"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function getObservationsByCompany(companyId: string) {
  const firestore = requireFirestore();
  const snapshot = await getDocs(query(collection(firestore, "observations"), where("companyId", "==", companyId)));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id })) as ObservationRecord[];
}

export async function listObservations() {
  const firestore = requireFirestore();
  const snapshot = await getDocs(query(collection(firestore, "observations"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id })) as ObservationRecord[];
}
