import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { requireFirestore } from "./firebase";

export type CompanyFirestoreData = {
  id?: string;
  name: string;
  sector?: string;
  city?: string;
  state?: string;
  representative?: string;
  email?: string;
  phone?: string;
  folio?: string;
  status?: string;
  [key: string]: unknown;
};

export async function createCompany(data: CompanyFirestoreData) {
  const firestore = requireFirestore();
  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (data.id) {
    await setDoc(doc(firestore, "companies", data.id), payload);
    return data.id;
  }

  const ref = await addDoc(collection(firestore, "companies"), payload);
  return ref.id;
}

export async function updateCompany(companyId: string, data: Partial<CompanyFirestoreData>) {
  const firestore = requireFirestore();
  await updateDoc(doc(firestore, "companies", companyId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getCompanyById(companyId: string) {
  const firestore = requireFirestore();
  const snapshot = await getDoc(doc(firestore, "companies", companyId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function listCompanies() {
  const firestore = requireFirestore();
  const snapshot = await getDocs(query(collection(firestore, "companies"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}
