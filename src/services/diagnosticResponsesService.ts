import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { requireFirestore } from "./firebase";

export type DiagnosticResponseFirestoreData = {
  companyId: string;
  diagnosticId: string;
  diagnosticTitle: string;
  answers: Record<string, unknown>;
  moduleScores: unknown[];
  totalScore: number;
  maxScore: number;
  percentage: number;
  level: number;
  maturityTitle: string;
  semaphore: string;
  interpretation: string;
  completedAt: string;
  [key: string]: unknown;
};

export async function saveDiagnosticResponse(data: DiagnosticResponseFirestoreData) {
  const firestore = requireFirestore();
  const ref = await addDoc(collection(firestore, "diagnosticResponses"), {
    ...data,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function getResponsesByCompany(companyId: string) {
  const firestore = requireFirestore();
  const snapshot = await getDocs(
    query(
      collection(firestore, "diagnosticResponses"),
      where("companyId", "==", companyId),
    ),
  );
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a: Record<string, any>, b: Record<string, any>) => {
      const left = a.createdAt?.toMillis?.() ?? Date.parse(a.completedAt ?? "") ?? 0;
      const right = b.createdAt?.toMillis?.() ?? Date.parse(b.completedAt ?? "") ?? 0;
      return right - left;
    });
}

export async function listDiagnosticResponses() {
  const firestore = requireFirestore();
  const snapshot = await getDocs(query(collection(firestore, "diagnosticResponses"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}
