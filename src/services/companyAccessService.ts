import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/firebaseConfig";
import { getCompanyByFolio } from "./companiesService";

type CompanyAccessLookupResult = {
  found: boolean;
  company?: Record<string, unknown>;
};

export async function findCompanyForAccess(folio: string, email: string) {
  const normalizedFolio = folio.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();

  const directCompany = await getCompanyByFolio(normalizedFolio).catch(() => null);
  if (directCompany) return directCompany;

  const lookup = httpsCallable<{ folio: string; email: string }, CompanyAccessLookupResult>(
    getFunctions(app, "us-central1"),
    "findCompanyForAccess",
  );
  const response = await lookup({ folio: normalizedFolio, email: normalizedEmail });
  return response.data.found && response.data.company ? response.data.company : null;
}
