import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { requireFirestore } from "./firebase";

export type AccessRequestData = {
  folio: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  message?: string;
  sector?: string;
  city?: string;
  state?: string;
};

export type AccessRequestRecord = AccessRequestData & {
  id: string;
  status?: "pending" | "approved" | "rejected";
  reviewedAt?: unknown;
};

export async function saveAccessRequest(data: AccessRequestData) {
  const firestore = requireFirestore();
  const ref = await addDoc(collection(firestore, "accessRequests"), {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function listAccessRequests() {
  const firestore = requireFirestore();
  const snapshot = await getDocs(query(collection(firestore, "accessRequests"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id })) as AccessRequestRecord[];
}

export async function updateAccessRequestStatus(requestId: string, status: "approved" | "rejected") {
  const firestore = requireFirestore();
  await updateDoc(doc(firestore, "accessRequests", requestId), {
    status,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
