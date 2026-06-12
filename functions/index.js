const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizeFolio = (value) => String(value || "").trim().toUpperCase();

exports.findCompanyForAccess = onCall({ region: "us-central1" }, async (request) => {
  const folio = normalizeFolio(request.data?.folio);
  const email = normalizeEmail(request.data?.email);

  if (!folio || !email || !email.includes("@")) {
    throw new HttpsError("invalid-argument", "Captura un folio y correo válidos.");
  }

  const snapshot = await getFirestore()
    .collection("companies")
    .where("folio", "==", folio)
    .limit(5)
    .get();

  const match = snapshot.docs.find((document) => {
    const company = document.data();
    const allowedEmails = [
      ...(Array.isArray(company.allowedAccessEmails) ? company.allowedAccessEmails : []),
      company.primaryContactEmail,
      company.email,
      company.correo,
    ].map(normalizeEmail).filter(Boolean);
    const status = String(company.status || "Activa").toLowerCase();
    const accessStatus = String(company.accessStatus || "available").toLowerCase();
    return allowedEmails.includes(email) && status !== "inactiva" && !["inactive", "rejected"].includes(accessStatus);
  });

  if (!match) return { found: false };

  const company = match.data();
  return {
    found: true,
    company: {
      id: match.id,
      folio: company.folio || folio,
      name: company.name || company.nombreEmpresa || "",
      rfc: company.rfc || "",
      representative: company.primaryContactName || company.representative || "",
      email,
      phone: company.primaryContactPhone || company.phone || "",
      sector: company.sector || "",
      city: company.city || "",
      state: company.state || "",
      primaryContactName: company.primaryContactName || company.representative || "",
      primaryContactEmail: company.primaryContactEmail || company.email || email,
      primaryContactPhone: company.primaryContactPhone || company.phone || "",
      allowedAccessEmails: [email],
      accountCreated: Boolean(company.accountCreated),
      authUid: company.authUid || "",
      accessStatus: company.accessStatus || "available",
      status: company.status || "Activa"
    }
  };
});
