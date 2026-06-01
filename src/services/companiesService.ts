import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
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
  rfc?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  secondaryContactName?: string;
  secondaryContactEmail?: string;
  secondaryContactPhone?: string;
  allowedAccessEmails?: string[];
  accountCreated?: boolean;
  status?: string;
  authUid?: string;
  accessStatus?: string;
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
  return snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null;
}

export async function getCompanyByFolio(folio: string) {
  const firestore = requireFirestore();
  const normalizedFolio = folio.trim().toUpperCase();
  const directSnapshot = await getDoc(doc(firestore, "companies", normalizedFolio));
  if (directSnapshot.exists()) return { ...directSnapshot.data(), id: directSnapshot.id };

  const snapshot = await getDocs(query(collection(firestore, "companies"), where("folio", "==", normalizedFolio)));
  const company = snapshot.docs[0];
  return company ? { ...company.data(), id: company.id } : null;
}

export async function getCompanyByAuthUid(authUid: string) {
  const firestore = requireFirestore();
  const snapshot = await getDocs(query(collection(firestore, "companies"), where("authUid", "==", authUid)));
  const company = snapshot.docs[0];
  return company ? { ...company.data(), id: company.id } : null;
}

export async function listCompanies() {
  const firestore = requireFirestore();
  const snapshot = await getDocs(query(collection(firestore, "companies"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
}
