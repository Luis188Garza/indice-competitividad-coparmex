import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Download,
  Eye,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Gavel,
  Landmark,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  MessageSquarePlus,
  Mail,
  Route,
  ShieldCheck,
  Users,
  UserRoundCheck,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { diagnosticICE } from "./data/diagnosticICE";
import { diagnosticResponseBank } from "./data/diagnosticResponseBank";
import { getComplianceLevel, platformContentConfig } from "./data/platformContentConfig";
import { activityLog, companies, diagnostics, documents, observations } from "./data/mockData";
import { CompanyProfile, DiagnosticResult, SelectedDiagnosticOption } from "./types";
import { changeCurrentUserPassword, loginWithEmail, listenAuthState, logout as firebaseLogout, registerWithEmail, sendRecoveryEmail } from "./services/authService";
import { createCompany, getCompanyByAuthUid, getCompanyByFolio, listCompanies, updateCompany } from "./services/companiesService";
import { listAccessRequests, saveAccessRequest, updateAccessRequestStatus, type AccessRequestRecord } from "./services/accessRequestsService";
import { getResponsesByCompany, listDiagnosticResponses, saveDiagnosticResponse } from "./services/diagnosticResponsesService";
import { createObservation, getObservationsByCompany, listObservations, type ObservationRecord } from "./services/observationsService";
import { calculateDiagnostic } from "./utils/scoring";
import { CompanyImportRow, DuplicateMode, parseCompanyImportFile } from "./utils/companyImport";

type View = "landing" | "about" | "login" | "loginEmpresa" | "loginAdmin" | "requestAccess" | "register" | "questionnaire" | "result" | "company" | "admin" | "stats" | "detail";
type CompanyTab = "dashboard" | "autodiagnostico" | "resultado" | "recomendaciones" | "observaciones" | "perfil" | "documentacion";
type AdminTab = "panel" | "empresas" | "solicitudes" | "diagnosticos" | "estadisticas" | "observaciones" | "reportes" | "configuracion";
type AdminIntent = "import-companies" | "pending-companies" | "priority-report" | "companies-report" | null;
type Session = { isAuthenticated: boolean; role: "empresa" | "admin" | null; companyId?: string; adminName?: string };
type AnswerState = Record<string, SelectedDiagnosticOption>;
type AdminCompany = CompanyProfile & { accessStatus?: string; authUid?: string; folio?: string; rfc?: string; numeroSocio?: string; nombreEmpresa?: string; correo?: string; numeroEmpleados?: number | null; tamanoEmpresa?: string | null; mustChangePassword?: boolean; source?: "firestore" | "mock" };
type AppRoute = { view: View; companyTab?: CompanyTab; adminTab?: AdminTab; privateRole?: "empresa" | "admin" };
type AdminDiagnosticRecord = { id: string; companyId: string; companyName: string; companySector: string; completedAt: string; result: DiagnosticResult; source: "saved" | "local" };
type PresidentLetter = { title: string; presidentName: string; presidentRole: string; body: string };

const diagnosticModules = diagnosticICE.modules.slice().sort((a, b) => a.order - b.order);
const diagnosticQuestions = diagnosticModules.flatMap((module) => module.questions.slice().sort((a, b) => a.order - b.order));
const presidentLetterStorageKey = "icePresidentLetter";
const defaultPresidentLetter: PresidentLetter = {
  title: "Carta de bienvenida COPARMEX",
  presidentName: "Presidencia COPARMEX Nuevo Laredo",
  presidentRole: "COPARMEX Nuevo Laredo",
  body: "En COPARMEX Nuevo Laredo creemos que una empresa más organizada, institucional y preparada fortalece su capacidad para crecer, generar empleo y contribuir al desarrollo de nuestra comunidad.\n\nEl Índice de Competitividad Empresarial busca acompañar a las empresas afiliadas en la identificación de fortalezas y áreas de oportunidad, brindando una lectura clara que facilite decisiones y acciones de mejora.\n\nTe invitamos a responder este autodiagnóstico con apertura y visión de futuro.",
};
const getPresidentLetter = (): PresidentLetter => {
  if (typeof window === "undefined") return defaultPresidentLetter;
  try {
    return { ...defaultPresidentLetter, ...JSON.parse(window.localStorage.getItem(presidentLetterStorageKey) || "{}") };
  } catch {
    return defaultPresidentLetter;
  }
};
const escapeLetterHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character] ?? character));
const openPresidentLetter = () => {
  const letter = getPresidentLetter();
  const paragraphs = letter.body.split(/\n\s*\n/).filter(Boolean).map((paragraph) => `<p>${escapeLetterHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeLetterHtml(letter.title)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f3f6fa;color:#102d4d;font-family:Arial,sans-serif}.page{width:min(760px,calc(100% - 32px));margin:40px auto;padding:42px;background:white;border-top:6px solid #0868b7;box-shadow:0 18px 50px rgba(9,40,74,.12)}h1{margin:0 0 26px;font-size:34px}p{line-height:1.7;color:#334e68}.signature{margin-top:34px;padding-top:20px;border-top:1px solid #d8e2ed}.signature strong,.signature span{display:block}.signature span{margin-top:5px;color:#667b91}@media(max-width:600px){.page{margin:16px auto;padding:24px}h1{font-size:27px}}</style></head><body><main class="page"><h1>${escapeLetterHtml(letter.title)}</h1>${paragraphs}<div class="signature"><strong>${escapeLetterHtml(letter.presidentName)}</strong><span>${escapeLetterHtml(letter.presidentRole)}</span></div></main></body></html>`;
  const letterUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(letterUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(letterUrl), 60_000);
};
const answerDisplayOrder = (label: string) => {
  const normalized = label.trim().toLocaleLowerCase("es-MX");
  if (normalized === "sí" || normalized.startsWith("sí,")) return 0;
  if (normalized === "no") return 1;
  if (normalized === "parcial") return 2;
  if (normalized === "no aplica") return 3;
  return 4;
};
const answerVisualTone = (_label?: string) => "answer-institutional";
const moduleIcon = (moduleId: string) => {
  const icons: Record<string, React.ReactNode> = {
    constitucion: <Landmark size={18} />,
    gobierno: <Users size={18} />,
    libros: <BookOpen size={18} />,
    representacion: <Gavel size={18} />,
    contratos: <FileText size={18} />,
    cumplimiento: <ShieldCheck size={18} />,
    continuidad: <Route size={18} />,
  };
  return icons[moduleId] ?? <BriefcaseBusiness size={18} />;
};
const toUpperText = (value: unknown) => String(value || "").toLocaleUpperCase("es-MX");
const normalizeEmail = (value: unknown) => String(value || "").trim().toLowerCase();
const normalizePhone = (value: unknown) => String(value || "").replace(/\D/g, "").slice(0, 10);
const normalizeRfcMoral = (value: unknown) => toUpperText(value).replace(/[^A-Z0-9Ñ&]/g, "").slice(0, 12);
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isValidRfcMoral = (value: string) => /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/.test(value.trim().toLocaleUpperCase("es-MX"));
const hasActiveAccount = (company: Record<string, any>) => Boolean(company.accountCreated || company.authUid || String(company.accessStatus || "").toLowerCase() === "active");

const demoFolioCompany = {
  id: "1234",
  folio: "1234",
  name: "EMPRESA DE DEMOSTRACIÓN COPARMEX",
  rfc: "EDC260101ABC",
  representative: "ANDREA VILLARREAL",
  email: "empresa.demo@coparmexnld.org.mx",
  phone: "8671234567",
  primaryContactName: "ANDREA VILLARREAL",
  primaryContactEmail: "empresa.demo@coparmexnld.org.mx",
  primaryContactPhone: "8671234567",
  secondaryContactName: "MARIANA GARZA",
  secondaryContactEmail: "contacto.demo@coparmexnld.org.mx",
  secondaryContactPhone: "8677654321",
  allowedAccessEmails: ["empresa.demo@coparmexnld.org.mx", "contacto.demo@coparmexnld.org.mx"],
  accountCreated: false,
  accessStatus: "available",
  sector: "Administración y desarrollo empresarial",
  city: "NUEVO LAREDO",
  state: "Tamaulipas",
  comments: "REGISTRO LOCAL DE DEMOSTRACIÓN PARA VALIDAR EL FLUJO DE SOLICITUD DE ACCESO.",
};

function readHashRoute(): AppRoute {
  const path = typeof window === "undefined" ? "/" : window.location.hash.replace(/^#/, "") || "/";
  const companyRoute = path.match(/^\/empresa\/(dashboard|autodiagnostico|resultado|recomendaciones|observaciones|perfil)$/);
  if (companyRoute) return { view: "company", companyTab: companyRoute[1] as CompanyTab, privateRole: "empresa" };
  const adminRoute = path.match(/^\/admin\/(empresas|estadisticas|observaciones|reportes|configuracion)$/);
  if (adminRoute) return { view: "admin", adminTab: adminRoute[1] as AdminTab, privateRole: "admin" };

  if (path === "/obtener-acceso" || path === "/solicitar-acceso") return { view: "requestAccess" };
  if (path === "/login") return { view: "login" };
  if (path === "/admin") return { view: "admin", adminTab: "panel", privateRole: "admin" };
  if (path === "/admin/solicitudes") return { view: "admin", adminTab: "solicitudes", privateRole: "admin" };
  return { view: "landing" };
}

function getHashForState(view: View, companyTab: CompanyTab, adminTab: AdminTab) {
  if (view === "requestAccess") return "#/obtener-acceso";
  if (view === "login" || view === "loginEmpresa" || view === "loginAdmin") return "#/login";
  if (view === "questionnaire") return "#/empresa/autodiagnostico";
  if (view === "result") return "#/empresa/resultado";
  if (view === "company") return `#/empresa/${companyTab === "documentacion" ? "dashboard" : companyTab}`;
  if (view === "admin") {
    return adminTab === "panel" ? "#/admin" : `#/admin/${adminTab}`;
  }
  return "";
}

const initialCompany: CompanyProfile = {
  id: "COP-NVO",
  name: "",
  sector: "Logística y operación",
  city: "Nuevo Laredo",
  state: "Tamaulipas",
  employees: "11-30",
  years: "3-5 años",
  email: "",
  phone: "",
  representative: "",
  registeredAt: new Date().toISOString().slice(0, 10),
  followUpStatus: "Sin iniciar",
  interestedInAdvisory: false,
};

const formatDate = (value: string) => new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(value));

function mapCompanyRecord(item: Record<string, any>): AdminCompany {
  return {
    id: String(item.id),
    folio: String(item.folio || item.id),
    name: String(item.name || "Empresa sin nombre"),
    sector: String(item.sector || "Sin sector"),
    city: String(item.city || "Nuevo Laredo"),
    state: String(item.state || "Tamaulipas"),
    employees: String(item.employees || "No especificado"),
    years: String(item.years || "No especificado"),
    email: String(item.primaryContactEmail || item.email || ""),
    phone: String(item.primaryContactPhone || item.phone || ""),
    representative: String(item.primaryContactName || item.representative || ""),
    registeredAt: typeof item.registeredAt === "string" ? item.registeredAt : new Date().toISOString().slice(0, 10),
    followUpStatus: String(item.followUpStatus || item.status || "Sin iniciar") as CompanyProfile["followUpStatus"],
    interestedInAdvisory: Boolean(item.interestedInAdvisory),
    accessStatus: String(item.accessStatus || "active"),
    authUid: item.authUid ? String(item.authUid) : undefined,
    rfc: item.rfc ? String(item.rfc) : undefined,
    numeroSocio: item.numeroSocio ? String(item.numeroSocio) : undefined,
    nombreEmpresa: item.nombreEmpresa ? String(item.nombreEmpresa) : undefined,
    correo: item.correo ? String(item.correo) : undefined,
    numeroEmpleados: typeof item.numeroEmpleados === "number" ? item.numeroEmpleados : null,
    tamanoEmpresa: item.tamanoEmpresa ? String(item.tamanoEmpresa) : undefined,
    mustChangePassword: Boolean(item.mustChangePassword),
    source: "firestore",
  };
}

function getAllowedAccessEmails(company: Record<string, any>) {
  const configured = Array.isArray(company.allowedAccessEmails) ? company.allowedAccessEmails : [];
  const fallback = [company.primaryContactEmail, company.secondaryContactEmail, company.email];
  return [...configured, ...fallback].map(normalizeEmail).filter(Boolean);
}

function isCompanyActiveForAccess(company: Record<string, any>) {
  const status = toUpperText(company.status || "ACTIVA");
  const accessStatus = String(company.accessStatus || "").toLowerCase();
  return status !== "INACTIVA" && accessStatus !== "rejected" && accessStatus !== "inactive";
}

function mapAuthorizedCompanyForAccess(rawCompany: Record<string, any>) {
  const mapped = mapCompanyRecord(rawCompany);
  return {
    id: mapped.id,
    folio: getCompanyFolio(mapped),
    name: mapped.name,
    rfc: normalizeRfcMoral(rawCompany.rfc),
    representative: toUpperText(rawCompany.primaryContactName || mapped.representative),
    email: normalizeEmail(rawCompany.primaryContactEmail || mapped.email),
    phone: normalizePhone(rawCompany.primaryContactPhone || mapped.phone),
    sector: mapped.sector,
    city: toUpperText(mapped.city),
    state: toUpperText(mapped.state),
    comments: toUpperText(rawCompany.comments),
  };
}

function getCompanyFolio(company: CompanyProfile | AdminCompany) {
  return "folio" in company && typeof company.folio === "string" && company.folio ? company.folio : company.id;
}

function getCompanyEmployeeCount(company: CompanyProfile | AdminCompany) {
  if ("numeroEmpleados" in company && typeof company.numeroEmpleados === "number") return company.numeroEmpleados;
  const values = String(company.employees || "").match(/\d+/g)?.map(Number) ?? [];
  return values.length ? Math.max(...values) : null;
}

function getCompanySize(company: CompanyProfile | AdminCompany) {
  if ("tamanoEmpresa" in company && company.tamanoEmpresa) return company.tamanoEmpresa;
  const employees = getCompanyEmployeeCount(company);
  if (employees === null) return "No calculado";
  if (employees <= 10) return "Micro";
  if (employees <= 50) return "Pequeña";
  if (employees <= 100) return "Mediana";
  return "Grande";
}

function getAnswerStorageKey(companyId: string) {
  return `ice-diagnostic-answers-${companyId}`;
}

function normalizePhoneForWhatsapp(phone?: string) {
  return (phone || "").replace(/\D/g, "");
}

function getAccessMessage(request: AccessRequestRecord) {
  const greetingName = request.contactName || request.companyName;
  return `Hola, ${greetingName}.

Tu solicitud de acceso al Autodiagnóstico ICE COPARMEX fue aprobada.

Usuario: ${request.email}

Ingresa con la contraseña que registraste al enviar tu solicitud.

Ingresa a la plataforma para realizar tu autodiagnóstico.`;
}

function getRequestComments(request: AccessRequestRecord) {
  return request.comments || request.message || "";
}

function formatRequestDate(value: unknown) {
  if (!value) return "No disponible";
  if (typeof value === "string") return formatDate(value);
  const millis = (value as { toMillis?: () => number }).toMillis?.();
  return millis ? formatDate(new Date(millis).toISOString()) : "No disponible";
}

function formatSavedDate(value: unknown) {
  if (!value) return "Reciente";
  if (typeof value === "string") return formatDate(value);
  const millis = (value as { toMillis?: () => number }).toMillis?.();
  return millis ? formatDate(new Date(millis).toISOString()) : "Reciente";
}

function observationTime(value: unknown) {
  if (typeof value === "string") return Date.parse(value) || 0;
  return (value as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
}

function getFriendlyErrorMessage(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : "";
  if (raw.includes("auth/email-already-in-use")) return "Este correo ya tiene una cuenta registrada.";
  if (raw.includes("auth/invalid-email")) return "Captura un correo válido.";
  if (raw.includes("auth/weak-password")) return "La contraseña debe tener al menos 8 caracteres.";
  if (raw.includes("auth/invalid-credential") || raw.includes("auth/wrong-password") || raw.includes("auth/user-not-found")) return "Correo o contraseña incorrectos.";
  const technicalMarkers = ["Firebase", "Firestore", "auth/", "UID", "collection", "document"];
  if (!raw || technicalMarkers.some((marker) => raw.includes(marker))) return fallback;
  return raw;
}

function mapDiagnosticResponse(item: Record<string, any>): DiagnosticResult {
  const calculated = item.answers ? calculateDiagnostic(item.answers as AnswerState) : null;
  return {
    totalScore: Number(item.totalScore ?? calculated?.totalScore ?? 0),
    maxScore: Number(item.maxScore ?? calculated?.maxScore ?? diagnosticICE.totalPoints),
    percentage: Number(item.percentage ?? calculated?.percentage ?? 0),
    maturity: {
      level: Number(item.level ?? calculated?.maturity.level ?? 0),
      title: String(item.maturityTitle ?? calculated?.maturity.title ?? "Sin resultado"),
      range: String(calculated?.maturity.range ?? ""),
      trafficLight: String(item.semaphore ?? calculated?.maturity.trafficLight ?? "rojo") as DiagnosticResult["maturity"]["trafficLight"],
      message: String(item.interpretation ?? calculated?.maturity.message ?? "Aún no hay interpretación disponible."),
    },
    moduleScores: Array.isArray(item.moduleScores) ? item.moduleScores as DiagnosticResult["moduleScores"] : calculated?.moduleScores ?? [],
    findings: calculated?.findings ?? [],
    recommendations: calculated?.recommendations ?? [],
    completedAt: typeof item.completedAt === "string" ? item.completedAt : new Date().toISOString(),
    diagnosticVersion: item.diagnosticVersion ? String(item.diagnosticVersion) : undefined,
    scoringVersion: item.scoringVersion ? String(item.scoringVersion) : undefined,
  };
}

function mapAdminDiagnosticRecord(item: Record<string, any>): AdminDiagnosticRecord {
  const result = mapDiagnosticResponse(item);
  return {
    id: String(item.id || item.diagnosticId || "Autodiagnóstico"),
    companyId: String(item.companyId || ""),
    companyName: String(item.companyName || "Empresa"),
    companySector: String(item.companySector || "Sin sector"),
    completedAt: typeof item.completedAt === "string" ? item.completedAt : result.completedAt,
    result,
    source: "saved",
  };
}

function App() {
  const initialRoute = useMemo(() => readHashRoute(), []);
  const [view, setView] = useState<View>(initialRoute.view);
  const [companyTab, setCompanyTab] = useState<CompanyTab>(initialRoute.companyTab ?? "dashboard");
  const [adminTab, setAdminTab] = useState<AdminTab>(initialRoute.adminTab ?? "panel");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(companies[0].id);
  const [selectedAdminCompany, setSelectedAdminCompany] = useState<AdminCompany | null>(null);
  const [session, setSession] = useState<Session>(() => {
    if (typeof window === "undefined") return { isAuthenticated: false, role: null };
    const savedAdmin = window.localStorage.getItem("ice-admin-session");
    return savedAdmin ? JSON.parse(savedAdmin) as Session : { isAuthenticated: false, role: null };
  });
  const [authenticatedCompany, setAuthenticatedCompany] = useState<AdminCompany | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem("ice-current-company");
    return saved ? JSON.parse(saved) as AdminCompany : null;
  });
  const [authReady, setAuthReady] = useState(() => {
    if (typeof window === "undefined") return true;
    const hasAdminSession = Boolean(window.localStorage.getItem("ice-admin-session"));
    return hasAdminSession;
  });
  const [profile, setProfile] = useState<CompanyProfile>(initialCompany);
  const [currentModule, setCurrentModule] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [latestCompanyResult, setLatestCompanyResult] = useState<DiagnosticResult | null>(null);
  const [latestResultLoading, setLatestResultLoading] = useState(false);
  const [latestResultError, setLatestResultError] = useState("");
  const [savedAdminDiagnostics, setSavedAdminDiagnostics] = useState<AdminDiagnosticRecord[]>([]);
  const [adminDiagnosticsLoading, setAdminDiagnosticsLoading] = useState(false);
  const [adminDiagnosticsError, setAdminDiagnosticsError] = useState("");
  const [saveState, setSaveState] = useState<{ loading: boolean; error: string; success: string }>({ loading: false, error: "", success: "" });
  const skipNextAnswerSave = useRef(false);

  const latestSavedByCompany = new Map(savedAdminDiagnostics.map((diagnostic) => [diagnostic.companyId, diagnostic]));
  const adminLatestDiagnostics = [...latestSavedByCompany.values()];
  const selectedCompany = selectedAdminCompany?.id === selectedCompanyId ? selectedAdminCompany : (companies.find((company) => company.id === selectedCompanyId) ?? companies[0]);
  const selectedDiagnostic = adminLatestDiagnostics.find((diagnostic) => diagnostic.companyId === selectedCompany.id);
  const showcaseDiagnostic = selectedDiagnostic?.result ?? null;
  const sessionCompany = authenticatedCompany ?? companies.find((company) => company.id === session.companyId);
  const activeCompany = sessionCompany ?? (profile.name ? profile : companies[0]);
  const activeDiagnostic = diagnostics.find((diagnostic) => diagnostic.companyId === activeCompany.id && diagnostic.result);
  const activeResult = result ?? latestCompanyResult ?? (authenticatedCompany ? null : (activeDiagnostic?.result ?? null));
  const activeCompanyId = activeCompany.id;
  const requiresPasswordChange = false;
  const currentQuestions = diagnosticModules[currentModule].questions.slice().sort((a, b) => a.order - b.order);
  const answeredQuestions = diagnosticQuestions.filter((question) => answers[question.id] !== undefined).length;
  const progress = Math.round((answeredQuestions / diagnosticQuestions.length) * 100);

  useEffect(() => {
    if (!activeCompanyId) return;
    const saved = window.localStorage.getItem(getAnswerStorageKey(activeCompanyId));
    skipNextAnswerSave.current = true;
    setAnswers(saved ? JSON.parse(saved) as AnswerState : {});
    setCurrentModule(0);
    setResult(null);
    setSaveState({ loading: false, error: "", success: "" });
  }, [activeCompanyId]);

  useEffect(() => {
    if (!activeCompanyId) return;
    if (skipNextAnswerSave.current) {
      skipNextAnswerSave.current = false;
      return;
    }
    window.localStorage.setItem(getAnswerStorageKey(activeCompanyId), JSON.stringify(answers));
  }, [answers, activeCompanyId]);

  useEffect(() => {
    let mounted = true;
    if (!authenticatedCompany?.id) {
      setLatestCompanyResult(null);
      setLatestResultError("");
      setLatestResultLoading(false);
      return;
    }

    setLatestResultLoading(true);
    getResponsesByCompany(authenticatedCompany.id)
      .then((items) => {
        if (!mounted) return;
        const latest = items[0] ? mapDiagnosticResponse(items[0] as Record<string, any>) : null;
        setLatestCompanyResult(latest);
        setLatestResultError("");
      })
      .catch((error) => {
        if (!mounted) return;
        setLatestCompanyResult(null);
        setLatestResultError(getFriendlyErrorMessage(error, "No fue posible consultar autodiagnósticos guardados."));
      })
      .finally(() => {
        if (mounted) setLatestResultLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [authenticatedCompany?.id]);

  useEffect(() => {
    let mounted = true;
    if (!session.isAuthenticated || session.role !== "admin") {
      setSavedAdminDiagnostics([]);
      setAdminDiagnosticsError("");
      setAdminDiagnosticsLoading(false);
      return;
    }

    setAdminDiagnosticsLoading(true);
    listDiagnosticResponses()
      .then((items) => {
        if (!mounted) return;
        const saved = items.map((item) => mapAdminDiagnosticRecord(item as Record<string, any>));
        const latest = new Map<string, AdminDiagnosticRecord>();
        saved.forEach((diagnostic) => {
          if (diagnostic.companyId && !latest.has(diagnostic.companyId)) latest.set(diagnostic.companyId, diagnostic);
        });
        setSavedAdminDiagnostics([...latest.values()]);
        setAdminDiagnosticsError("");
      })
      .catch((error) => {
        if (!mounted) return;
        setSavedAdminDiagnostics([]);
        setAdminDiagnosticsError(getFriendlyErrorMessage(error, "No fue posible consultar autodiagnósticos guardados."));
      })
      .finally(() => {
        if (mounted) setAdminDiagnosticsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [session.isAuthenticated, session.role]);

  useEffect(() => {
    const unsubscribe = listenAuthState(async (user) => {
      if (!user) {
        setAuthenticatedCompany(null);
        window.localStorage.removeItem("ice-current-company");
        setAuthReady(true);
        return;
      }

      try {
        const companyData = await getCompanyByAuthUid(user.uid);
        if (!companyData) {
          setAuthReady(true);
          return;
        }

        const company = mapCompanyRecord(companyData as Record<string, any>);
        if (company.accessStatus && company.accessStatus.toLowerCase() !== "active") {
          setAuthReady(true);
          return;
        }

        setAuthenticatedCompany(company);
        setSession({ isAuthenticated: true, role: "empresa", companyId: company.id });
        setSelectedCompanyId(company.id);
        setView((current) => ["landing", "login", "loginEmpresa", "requestAccess"].includes(current) ? "company" : current);
        window.localStorage.setItem("ice-current-company", JSON.stringify(company));
      } catch {
        // El login muestra los errores operativos; el listener solo intenta restaurar sesión.
      } finally {
        setAuthReady(true);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (session.isAuthenticated && session.role === "admin" && ["landing", "login", "loginAdmin"].includes(view)) {
      setView("admin");
    }
  }, [session.isAuthenticated, session.role, view]);

  useEffect(() => {
    if (!authReady) return;

    const applyHashRoute = () => {
      const route = readHashRoute();
      if (route.privateRole && (!session.isAuthenticated || session.role !== route.privateRole)) {
        setView("login");
        window.location.hash = "#/login";
        return;
      }

      setView(route.view);
      if (route.companyTab) setCompanyTab(route.companyTab);
      if (route.adminTab) setAdminTab(route.adminTab);
    };

    applyHashRoute();
    window.addEventListener("hashchange", applyHashRoute);
    return () => window.removeEventListener("hashchange", applyHashRoute);
  }, [authReady, session.isAuthenticated, session.role]);

  useEffect(() => {
    if (!authReady) return;
    const privateCompanyView = view === "company" || view === "questionnaire" || view === "result";
    const privateAdminView = view === "admin" || view === "stats" || view === "detail";
    if ((privateCompanyView && session.role !== "empresa") || (privateAdminView && session.role !== "admin")) {
      setView("login");
      if (window.location.hash !== "#/login") window.location.hash = "#/login";
      return;
    }

    const nextHash = getHashForState(view, companyTab, adminTab);
    if (!nextHash) {
      if (window.location.hash) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      return;
    }
    if (window.location.hash !== nextHash) window.location.hash = nextHash;
  }, [adminTab, authReady, companyTab, session.role, view]);

  const stats = useMemo(() => {
    const average = Math.round(adminLatestDiagnostics.reduce((sum, diagnostic) => sum + diagnostic.result.percentage, 0) / Math.max(adminLatestDiagnostics.length, 1));
    const highRisk = adminLatestDiagnostics.filter((diagnostic) => diagnostic.result.percentage < 50).length;
    const solid = adminLatestDiagnostics.filter((diagnostic) => diagnostic.result.percentage >= 85).length;
    const advisory = 0;
    const pending = 0;
    const moduleAverages = diagnosticModules.map((module) => {
      const values = adminLatestDiagnostics
        .map((diagnostic) => diagnostic.result.moduleScores.find((score) => score.moduleId === module.id)?.percentage)
        .filter((value): value is number => typeof value === "number");
      return { title: module.title, value: Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)) };
    });
    const sectors = [...new Set(adminLatestDiagnostics.map((diagnostic) => diagnostic.companySector))].map((sector) => ({
      sector,
      count: adminLatestDiagnostics.filter((diagnostic) => diagnostic.companySector === sector).length,
      average: Math.round(
        adminLatestDiagnostics
          .filter((diagnostic) => diagnostic.companySector === sector)
          .reduce((sum, diagnostic, _, array) => sum + diagnostic.result.percentage / Math.max(array.length, 1), 0),
      ),
    }));
    return { average, highRisk, solid, advisory, pending, moduleAverages, sectors, diagnostics: adminLatestDiagnostics };
  }, [adminLatestDiagnostics]);

  const completeDiagnostic = async () => {
    const nextResult = calculateDiagnostic(answers);
    setResult(nextResult);
    setView("result");
    setSaveState({ loading: true, error: "", success: "" });

    try {
      const responseId = await saveDiagnosticResponse({
        companyId: activeCompany.id,
        companyFolio: getCompanyFolio(activeCompany),
        companyName: activeCompany.name,
        companySector: activeCompany.sector,
        companyState: activeCompany.state,
        diagnosticId: diagnosticICE.id,
        diagnosticTitle: diagnosticICE.title,
        answers,
        moduleScores: nextResult.moduleScores,
        totalScore: nextResult.totalScore,
        maxScore: nextResult.maxScore,
        percentage: nextResult.percentage,
        level: nextResult.maturity.level,
        maturityTitle: nextResult.maturity.title,
        semaphore: nextResult.maturity.trafficLight,
        interpretation: nextResult.maturity.message,
        completedAt: nextResult.completedAt,
        diagnosticVersion: nextResult.diagnosticVersion,
        scoringVersion: nextResult.scoringVersion,
      });
      window.localStorage.removeItem(getAnswerStorageKey(activeCompany.id));
      skipNextAnswerSave.current = true;
      setAnswers({});
      setLatestCompanyResult(nextResult);
      setSaveState({ loading: false, error: "", success: `Autodiagnóstico guardado correctamente. Folio de respuesta: ${responseId}` });
    } catch (error) {
      const message = getFriendlyErrorMessage(error, "No fue posible guardar el autodiagnóstico en el sistema.");
      setSaveState({ loading: false, error: message, success: "" });
    }
  };

  const simulatePdf = () => {
    window.print();
  };

  const startDiagnostic = () => {
    const saved = window.localStorage.getItem(getAnswerStorageKey(activeCompany.id));
    setAnswers(saved ? JSON.parse(saved) as AnswerState : {});
    setCurrentModule(0);
    setResult(null);
    setSaveState({ loading: false, error: "", success: "" });
    setView("questionnaire");
  };

  const cancelDiagnostic = () => {
    window.localStorage.removeItem(getAnswerStorageKey(activeCompany.id));
    skipNextAnswerSave.current = true;
    setAnswers({});
    setCurrentModule(0);
    setResult(null);
    setSaveState({ loading: false, error: "", success: "" });
    setCompanyTab("dashboard");
    setView("company");
  };

  const logout = () => {
    if (session.role === "empresa") {
      void firebaseLogout();
    }
    skipNextAnswerSave.current = true;
    setSession({ isAuthenticated: false, role: null });
    setAuthenticatedCompany(null);
    setAnswers({});
    setResult(null);
    setLatestCompanyResult(null);
    setLatestResultError("");
    window.localStorage.removeItem("ice-current-company");
    window.localStorage.removeItem("ice-admin-session");
    setView("landing");
    setCompanyTab("dashboard");
    setAdminTab("panel");
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  };

  const completePasswordChange = () => {
    if (!authenticatedCompany) return;
    const updatedCompany = { ...authenticatedCompany, mustChangePassword: false };
    setAuthenticatedCompany(updatedCompany);
    window.localStorage.setItem("ice-current-company", JSON.stringify(updatedCompany));
    setView("company");
  };

  const loginCompany = async (email: string, password: string) => {
    const credential = await loginWithEmail(email.trim(), password);
    const companyData = await getCompanyByAuthUid(credential.user.uid);

    if (!companyData) {
      await firebaseLogout();
      throw new Error("No encontramos una empresa vinculada a este usuario.");
    }

    const company = mapCompanyRecord(companyData as Record<string, any>);
    if (company.accessStatus && company.accessStatus.toLowerCase() !== "active") {
      await firebaseLogout();
      if (company.accessStatus.toLowerCase() === "pending") {
        throw new Error("Tu solicitud de acceso está en revisión.");
      }
      if (company.accessStatus.toLowerCase() === "rejected") {
        throw new Error("Tu solicitud de acceso fue rechazada.");
      }
      throw new Error("El acceso de esta empresa no está activo.");
    }

    setAuthenticatedCompany(company);
    window.localStorage.setItem("ice-current-company", JSON.stringify(company));
    setSession({ isAuthenticated: true, role: "empresa", companyId: company.id });
    setSelectedCompanyId(company.id);
    setCompanyTab("dashboard");
    setView("company");
  };

  const loginAdmin = (user: string, password: string) => {
    if (user.trim().toLowerCase() === "admin@coparmexnld.org.mx" && password === "admin123") {
      setSession({ isAuthenticated: true, role: "admin", adminName: "Administrador COPARMEX" });
      window.localStorage.setItem("ice-admin-session", JSON.stringify({ isAuthenticated: true, role: "admin", adminName: "Administrador COPARMEX" }));
      setAdminTab("panel");
      setView("admin");
      return true;
    }
    return false;
  };

  return (
    <div className="app">
      <header className="topbar">
        <button className="icon-button mobile-only" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
          <Menu size={20} />
        </button>
        <button className="brand" onClick={() => session.isAuthenticated ? undefined : setView("landing")}>
          <span className="brand-mark">
            <img src="/coparmex.PNG" alt="COPARMEX Nuevo Laredo" />
          </span>
          <span>
            <strong>COPARMEX Nuevo Laredo</strong>
            <small>Índice de Competitividad Empresarial</small>
          </span>
        </button>
        <HeaderNav session={session} activeCompany={activeCompany} onNavigate={setView} onLogout={logout} />
      </header>

      {mobileOpen && (
        <div className="drawer-layer" onClick={() => setMobileOpen(false)}>
          <div className="mobile-panel" onClick={(event) => event.stopPropagation()}>
            <button className="icon-button close" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú">
              <X size={20} />
            </button>
            <MobileDrawerContent
              session={session}
              activeCompany={activeCompany}
              companyTab={companyTab}
              adminTab={adminTab}
              setCompanyTab={setCompanyTab}
              setAdminTab={setAdminTab}
              setView={setView}
              close={() => setMobileOpen(false)}
              logout={logout}
            />
          </div>
        </div>
      )}

      <main>
        {!authReady && <SessionRestoreScreen />}
        {authReady && view === "landing" && <Landing onPortal={() => setView("login")} onRequestAccess={() => setView("requestAccess")} />}
        {authReady && view === "about" && <AboutIndex onPortal={() => setView("login")} onRequestAccess={() => setView("requestAccess")} />}
        {authReady && view === "login" && <AccessHub onCompany={() => setView("loginEmpresa")} onAdmin={() => setView("loginAdmin")} />}
        {authReady && view === "loginEmpresa" && <CompanyLogin onLogin={loginCompany} />}
        {authReady && view === "loginAdmin" && <AdminLogin onLogin={loginAdmin} />}
        {authReady && view === "requestAccess" && <AccessRequestScreen onBack={() => setView("landing")} onLogin={() => setView("loginEmpresa")} />}
        {authReady && view === "register" && <Register profile={profile} setProfile={setProfile} onNext={() => setView("questionnaire")} />}
        {authReady && requiresPasswordChange && <PasswordChangeScreen company={authenticatedCompany!} onChanged={completePasswordChange} onLogout={logout} />}
        {authReady && !requiresPasswordChange && view === "questionnaire" && (
          <Questionnaire
            currentModule={currentModule}
            setCurrentModule={setCurrentModule}
            answers={answers}
            setAnswers={setAnswers}
            currentQuestions={currentQuestions}
            progress={progress}
            onComplete={completeDiagnostic}
            onCancel={cancelDiagnostic}
          />
        )}
        {authReady && !requiresPasswordChange && view === "result" && result && (
          <ResultScreen
            company={activeCompany}
            result={result}
            saveState={saveState}
            onPdf={simulatePdf}
            onPortal={() => { setSession({ isAuthenticated: true, role: "empresa", companyId: session.companyId }); setView("company"); }}
            onRecommendations={() => { setSession({ isAuthenticated: true, role: "empresa", companyId: session.companyId }); setCompanyTab("recomendaciones"); setView("company"); }}
          />
        )}
        {authReady && !requiresPasswordChange && view === "company" && session.role === "empresa" && (
          <CompanyPortal
            tab={companyTab}
            setTab={setCompanyTab}
            company={activeCompany}
            result={activeResult}
            loadingResult={latestResultLoading}
            resultError={latestResultError}
            onStart={startDiagnostic}
            onPdf={simulatePdf}
          />
        )}
        {authReady && view === "admin" && session.role === "admin" && (
          <AdminPortal
            tab={adminTab}
            setTab={setAdminTab}
            stats={stats}
            selectedCompanyId={selectedCompanyId}
            setSelectedCompanyId={setSelectedCompanyId}
            setSelectedAdminCompany={setSelectedAdminCompany}
            setView={setView}
            onPdf={simulatePdf}
            diagnostics={adminLatestDiagnostics}
            diagnosticsLoading={adminDiagnosticsLoading}
            diagnosticsError={adminDiagnosticsError}
          />
        )}
        {authReady && view === "stats" && session.role === "admin" && <RegionalStats stats={stats} />}
        {authReady && view === "detail" && session.role === "admin" && <CompanyDetail company={selectedCompany} result={showcaseDiagnostic} onBack={() => setView("admin")} onPdf={simulatePdf} />}
      </main>
    </div>
  );
}

function MobileDrawerContent(props: {
  session: Session;
  activeCompany: CompanyProfile;
  companyTab: CompanyTab;
  adminTab: AdminTab;
  setCompanyTab: (tab: CompanyTab) => void;
  setAdminTab: (tab: AdminTab) => void;
  setView: (view: View) => void;
  close: () => void;
  logout: () => void;
}) {
  const companyTabs: CompanyTab[] = ["dashboard", "autodiagnostico", "resultado", "recomendaciones", "observaciones", "perfil"];
  const adminTabs: AdminTab[] = ["panel", "empresas", "estadisticas", "observaciones", "reportes", "configuracion"];
  const go = (view: View) => {
    props.setView(view);
    props.close();
  };

  if (!props.session.isAuthenticated) {
    return (
      <>
        <div className="drawer-session"><strong>COPARMEX Nuevo Laredo</strong><span>Índice de Competitividad Empresarial</span></div>
        <button onClick={() => go("landing")}>Inicio</button>
        <button onClick={() => go("about")}>Acerca del índice</button>
        <button onClick={() => go("login")}>Iniciar sesión</button>
      </>
    );
  }

  if (props.session.role === "empresa") {
    return (
      <>
        <div className="drawer-session"><strong>{props.activeCompany.name}</strong><span>Folio: {getCompanyFolio(props.activeCompany)}</span></div>
        {companyTabs.map((tab) => (
          <button key={tab} className={props.companyTab === tab ? "active" : ""} onClick={() => { props.setCompanyTab(tab); props.setView("company"); props.close(); }}>{labelize(tab)}</button>
        ))}
        <button onClick={() => { props.logout(); props.close(); }}>Cerrar sesión</button>
      </>
    );
  }

  return (
    <>
      <div className="drawer-session"><strong>Administrador COPARMEX</strong><span>COPARMEX Nuevo Laredo</span></div>
      {adminTabs.map((tab) => (
        <button key={tab} className={props.adminTab === tab ? "active" : ""} onClick={() => { props.setAdminTab(tab); props.setView("admin"); props.close(); }}>{labelize(tab)}</button>
      ))}
      <button onClick={() => { props.setView("stats"); props.close(); }}>Indicador regional</button>
      <button onClick={() => { props.logout(); props.close(); }}>Cerrar sesión</button>
    </>
  );
}

function HeaderNav({ session, activeCompany, onNavigate, onLogout }: { session: Session; activeCompany: CompanyProfile; onNavigate: (view: View) => void; onLogout: () => void }) {
  if (!session.isAuthenticated) {
    return (
      <nav className="desktop-nav">
        <button onClick={() => onNavigate("landing")}>Inicio</button>
        <button onClick={() => onNavigate("about")}>Acerca del índice</button>
        <button onClick={() => onNavigate("login")}>Iniciar sesión</button>
      </nav>
    );
  }

  return (
    <nav className="session-nav">
      {session.role === "empresa" ? (
        <span className="session-pill">
          <small>Empresa</small>
          <strong>{activeCompany.name}</strong>
          <em>Folio: {getCompanyFolio(activeCompany)}</em>
        </span>
      ) : (
        <span className="session-pill admin-pill">
          <small>Administrador</small>
          <strong>{session.adminName}</strong>
          <em>COPARMEX Nuevo Laredo</em>
        </span>
      )}
      <button className="secondary" onClick={onLogout}><LogOut size={16} /> Cerrar sesión</button>
    </nav>
  );
}

function SessionRestoreScreen() {
  return (
    <section className="page narrow">
      <div className="card prepared">
        <ShieldCheck size={34} />
        <h2>Restaurando sesión</h2>
        <p>Estamos validando el acceso institucional antes de mostrar el portal correspondiente.</p>
      </div>
    </section>
  );
}

function Landing({ onPortal, onRequestAccess }: { onPortal: () => void; onRequestAccess: () => void }) {
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("iceWelcomeDismissed") !== "true";
  });
  const dismissWelcome = () => {
    window.localStorage.setItem("iceWelcomeDismissed", "true");
    setShowWelcome(false);
  };
  const requestAccess = () => {
    dismissWelcome();
    onRequestAccess();
  };
  const letter = getPresidentLetter();

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Herramienta institucional COPARMEX Nuevo Laredo</span>
          <h1>{platformContentConfig.generalTexts.welcomeTitle}</h1>
          <p>Autodiagnóstico institucional para conocer el nivel de madurez, cumplimiento y organización documental de tu empresa.</p>
          <div className="hero-actions">
            <button className="primary" onClick={requestAccess}>Obtener acceso</button>
            <button className="secondary" onClick={onPortal}>Iniciar sesión</button>
          </div>
          <div className="hero-info-chips" aria-label="Características del índice">
            <span><ClipboardList size={17} /> Autodiagnóstico empresarial</span>
            <span><ShieldCheck size={17} /> Semáforo de cumplimiento</span>
            <span><CheckCircle2 size={17} /> Recomendaciones puntuales</span>
          </div>
        </div>
      </section>
      {showWelcome && (
        <div className="welcome-modal-overlay">
          <section className="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-modal-title">
            <button className="welcome-modal-close" type="button" aria-label="Cerrar bienvenida" onClick={dismissWelcome}>
              <X size={20} />
            </button>
            <div className="welcome-modal-scroll">
              <article className="welcome-letter-sheet">
                <span className="eyebrow">COPARMEX Nuevo Laredo</span>
                <h2 id="welcome-modal-title">{letter.title}</h2>
                <div className="welcome-letter-body">
                  {letter.body.split(/\n\s*\n/).filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
                <footer>
                  <strong>{letter.presidentName}</strong>
                  <span>{letter.presidentRole}</span>
                </footer>
              </article>
            </div>
            <div className="welcome-modal-actions">
              <button className="primary" onClick={requestAccess}>Obtener acceso</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function AboutIndex({ onPortal, onRequestAccess }: { onPortal: () => void; onRequestAccess: () => void }) {
  const sections = [
    ["¿Qué puedes esperar de este autodiagnóstico?", platformContentConfig.generalTexts.outcome],
    ["¿Por qué un Índice de Competitividad Empresarial?", platformContentConfig.generalTexts.competitiveness],
    ["Objetivo del ICE", platformContentConfig.generalTexts.about],
    ["¿Qué recibirá la empresa al concluir?", "Un semáforo de cumplimiento, resultados por secciones y recomendaciones puntuales para orientar acciones de mejora."],
    ["¿Qué no es este diagnóstico?", "No sustituye una auditoría, dictamen legal, fiscal o especializado. Es una herramienta inicial de orientación empresarial."],
    ["¿Qué sucede después del diagnóstico?", "La empresa podrá revisar sus recomendaciones y, si lo considera oportuno, solicitar a COPARMEX una evaluación especializada."],
    ["¿Por qué se está haciendo esto?", "Para impulsar empresas más organizadas, preparadas y capaces de responder a oportunidades, riesgos y exigencias del entorno."],
    ["Duración", "El autodiagnóstico toma aproximadamente de 7 a 10 minutos."],
    ["Confidencialidad y uso de la información", "La información individual se mantiene protegida y su uso agregado permite construir indicadores institucionales sin revelar datos particulares."],
    ["Fuentes de referencia", "Marco normativo aplicable y mejores prácticas nacionales e internacionales en gobierno, cumplimiento y documentación empresarial."],
  ];
  return (
    <section className="page about-index">
      <div className="about-index-intro">
        <SectionTitle title="Acerca del índice" subtitle={platformContentConfig.generalTexts.about} />
      </div>
      <div className="about-method-grid">
        {sections.map(([title, text]) => (
          <article className="about-method-card" key={title}>
            <strong>{title}</strong>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="actions-row about-index-actions">
        <button className="primary" onClick={onRequestAccess}>Obtener acceso</button>
        <button className="secondary" onClick={onPortal}>Iniciar sesión</button>
      </div>
    </section>
  );
}

function AccessHub({ onCompany, onAdmin }: { onCompany: () => void; onAdmin: () => void }) {
  return (
    <section className="page narrow">
      <SectionTitle title="Índice de Competitividad Empresarial" subtitle="Acceso privado para empresas afiliadas y administración COPARMEX Nuevo Laredo." />
      <div className="access-grid">
        <button className="access-card" onClick={onCompany}>
          <Building2 size={34} />
          <strong>Acceso empresa</strong>
          <span>Consulta inicio, autodiagnóstico, resultado, recomendaciones puntuales y perfil.</span>
        </button>
        <button className="access-card" onClick={onAdmin}>
          <LockKeyhole size={34} />
          <strong>Acceso administrador</strong>
          <span>Gestiona empresas, autodiagnósticos, estadísticas, observaciones y reportes institucionales.</span>
        </button>
      </div>
    </section>
  );
}

function AccessRequestScreen({ onBack, onLogin }: { onBack: () => void; onLogin: () => void }) {
  const [form, setForm] = useState({
    folio: "",
    email: "",
    password: "",
    confirmPassword: "",
    privacyAccepted: false,
    termsAccepted: false,
  });
  const [verifiedCompany, setVerifiedCompany] = useState<ReturnType<typeof mapAuthorizedCompanyForAccess> | null>(null);
  const [verifiedRawCompany, setVerifiedRawCompany] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accountExists, setAccountExists] = useState(false);
  const update = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "folio" || field === "email") {
      setVerifiedCompany(null);
      setVerifiedRawCompany(null);
      setAccountExists(false);
      setSuccess("");
    }
  };

  const verifyCompany = async () => {
    const normalizedFolio = form.folio.trim().toUpperCase();
    const email = normalizeEmail(form.email);

    setError("");
    setSuccess("");
    setAccountExists(false);
    setVerifiedCompany(null);
    setVerifiedRawCompany(null);

    if (!normalizedFolio) {
      setError("Captura el folio COPARMEX.");
      return;
    }

    if (!email || !isValidEmail(email)) {
      setError("Captura un correo válido.");
      return;
    }

    setVerifying(true);
    try {
      let rawCompany = await getCompanyByFolio(normalizedFolio);
      if (!rawCompany && normalizedFolio === demoFolioCompany.folio) rawCompany = demoFolioCompany;

      if (!rawCompany || !isCompanyActiveForAccess(rawCompany as Record<string, any>)) {
        setError("No encontramos una empresa activa con esos datos. Verifica tu folio y correo registrado o contacta a COPARMEX Nuevo Laredo.");
        return;
      }

      const allowedEmails = getAllowedAccessEmails(rawCompany as Record<string, any>);
      if (!allowedEmails.includes(email)) {
        setError("No encontramos una empresa activa con esos datos. Verifica tu folio y correo registrado o contacta a COPARMEX Nuevo Laredo.");
        return;
      }

      const companyData = mapAuthorizedCompanyForAccess(rawCompany as Record<string, any>);
      setVerifiedCompany({ ...companyData, email });
      setVerifiedRawCompany(rawCompany as Record<string, any>);
      if (hasActiveAccount(rawCompany as Record<string, any>)) {
        setAccountExists(true);
        return;
      }

      setSuccess("Empresa verificada. Confirma los datos y crea tu acceso.");
    } catch (err) {
      if (normalizedFolio === demoFolioCompany.folio) {
        const allowedEmails = getAllowedAccessEmails(demoFolioCompany);
        if (allowedEmails.includes(email)) {
          const companyData = mapAuthorizedCompanyForAccess(demoFolioCompany);
          setVerifiedCompany({ ...companyData, email });
          setVerifiedRawCompany(demoFolioCompany);
          setSuccess("Empresa verificada. Confirma los datos y crea tu acceso.");
          return;
        }
      }
      setError(getFriendlyErrorMessage(err, "No encontramos una empresa activa con esos datos. Verifica tu folio y correo registrado o contacta a COPARMEX Nuevo Laredo."));
    } finally {
      setVerifying(false);
    }
  };

  const submit = async () => {
    const normalizedFolio = form.folio.trim().toUpperCase();
    const email = normalizeEmail(form.email);

    setError("");
    setSuccess("");

    if (!verifiedCompany || !verifiedRawCompany) {
      setError("Primero verifica tu empresa con folio y correo registrado.");
      return;
    }

    if (accountExists || hasActiveAccount(verifiedRawCompany)) {
      setAccountExists(true);
      setError("Esta empresa ya tiene una cuenta activa. Inicia sesión o recupera tu contraseña.");
      return;
    }

    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("La confirmación no coincide con la contraseña.");
      return;
    }

    if (!form.privacyAccepted || !form.termsAccepted) {
      setError("Debes aceptar el Aviso de Privacidad y los Términos y Condiciones para crear tu acceso.");
      return;
    }

    setLoading(true);
    try {
      const credential = await registerWithEmail(email, form.password);
      const companyId = verifiedCompany.id || normalizedFolio;
      const allowedEmails = getAllowedAccessEmails(verifiedRawCompany);
      const payload = {
        ...verifiedCompany,
        id: companyId,
        folio: normalizedFolio,
        email,
        primaryContactEmail: normalizeEmail(verifiedRawCompany.primaryContactEmail || email),
        primaryContactName: toUpperText(verifiedRawCompany.primaryContactName || verifiedCompany.representative),
        primaryContactPhone: normalizePhone(verifiedRawCompany.primaryContactPhone || verifiedCompany.phone),
        secondaryContactEmail: normalizeEmail(verifiedRawCompany.secondaryContactEmail),
        secondaryContactName: toUpperText(verifiedRawCompany.secondaryContactName),
        secondaryContactPhone: normalizePhone(verifiedRawCompany.secondaryContactPhone),
        allowedAccessEmails: allowedEmails,
        role: "company",
        status: "Activa",
        accessStatus: "active",
        followUpStatus: "Sin iniciar",
        interestedInAdvisory: false,
        accountCreated: true,
        authUid: credential.user.uid,
        activatedAt: new Date().toISOString(),
        privacyNoticeAccepted: true,
        privacyNoticeAcceptedAt: new Date().toISOString(),
        privacyNoticeVersion: "2026-05",
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: "2026-05",
      };

      if (companyId === demoFolioCompany.id && verifiedRawCompany === demoFolioCompany) {
        await createCompany(payload);
      } else {
        await updateCompany(companyId, payload);
      }

      setSuccess("Tu acceso fue creado correctamente. Ya puedes iniciar sesión.");
      setForm({ folio: "", email: "", password: "", confirmPassword: "", privacyAccepted: false, termsAccepted: false });
      setVerifiedCompany(null);
      setVerifiedRawCompany(null);
      await firebaseLogout();
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "No pudimos crear el acceso. Verifica tus datos e intenta nuevamente.");
      if (message.includes("correo ya tiene una cuenta")) setAccountExists(true);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const recoverPassword = async () => {
    setError("");
    setSuccess("");
    const emailToRecover = normalizeEmail(form.email);
    if (!emailToRecover || !isValidEmail(emailToRecover)) {
      setError("Captura un correo válido para recuperar tu contraseña.");
      return;
    }

    setRecoveryLoading(true);
    try {
      await sendRecoveryEmail(emailToRecover);
      setSuccess("Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.");
      setRecoveryOpen(false);
    } catch (err) {
      console.error("Password recovery failed", err);
      setSuccess("Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.");
      setRecoveryOpen(false);
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <section className="page narrow">
      <SectionTitle title="Obtener acceso" subtitle="Verifica tu empresa con el folio COPARMEX y el correo registrado para crear tu acceso a la plataforma." />
      <div className="login-card access-flow-card">
        <div className="access-step">
          <h3>Verifica tu empresa</h3>
          <Field label="Folio COPARMEX" value={form.folio} onChange={(value) => update("folio", value)} />
          <Field label="Correo registrado" value={form.email} onChange={(value) => update("email", value)} transform="none" type="email" />
          <button className="primary" onClick={verifyCompany} disabled={verifying}>{verifying ? "Verificando..." : "Verificar empresa"}</button>
        </div>

        {verifiedCompany && (
          <div className="company-confirm-card">
            <div>
              <span className="eyebrow">Empresa encontrada</span>
              <h3>{verifiedCompany.name}</h3>
              <p>Confirma que los datos corresponden a tu empresa antes de crear tu acceso.</p>
            </div>
            <div className="confirm-grid">
              <p><span>Nombre de empresa</span><strong>{verifiedCompany.name || "No disponible"}</strong></p>
              <p><span>RFC</span><strong>{verifiedCompany.rfc || "No disponible"}</strong></p>
              <p><span>Folio COPARMEX</span><strong>{verifiedCompany.folio}</strong></p>
              <p><span>Representante o contacto principal</span><strong>{verifiedCompany.representative || "No disponible"}</strong></p>
              <p><span>Correo registrado</span><strong>{verifiedCompany.email}</strong></p>
              <p><span>Teléfono</span><strong>{verifiedCompany.phone || "No disponible"}</strong></p>
              <p><span>Sector</span><strong>{verifiedCompany.sector || "No disponible"}</strong></p>
              <p><span>Ciudad</span><strong>{verifiedCompany.city || "No disponible"}</strong></p>
              <p><span>Estado</span><strong>{verifiedCompany.state || "No disponible"}</strong></p>
            </div>
          </div>
        )}

        {verifiedCompany && accountExists && (
          <div className="card prepared existing-account-card">
            <ShieldCheck size={30} />
            <h3>Esta empresa ya tiene una cuenta activa.</h3>
            <p>Inicia sesión o recupera tu contraseña para ingresar al portal empresa.</p>
            <div className="actions-row">
              <button className="primary" onClick={onLogin}>Iniciar sesión</button>
              <button className="secondary" onClick={() => setRecoveryOpen((current) => !current)}>Olvidé mi contraseña</button>
            </div>
            {recoveryOpen && (
              <div className="recovery-panel">
                <Field label="Correo registrado" value={form.email} onChange={(value) => update("email", value)} transform="none" type="email" />
                <button className="primary" onClick={recoverPassword} disabled={recoveryLoading}>{recoveryLoading ? "Enviando..." : "Enviar instrucciones"}</button>
              </div>
            )}
          </div>
        )}

        {verifiedCompany && !accountExists && (
          <div className="access-step">
            <h3>Crea tu acceso</h3>
            <PasswordField label="Nueva contraseña" value={form.password} onChange={(value) => update("password", value)} />
            <PasswordField label="Confirmar contraseña" value={form.confirmPassword} onChange={(value) => update("confirmPassword", value)} />
            <p className="field-hint">La contraseña debe tener al menos 8 caracteres.</p>
            <label className="check-row">
              <input type="checkbox" checked={form.privacyAccepted} onChange={(event) => update("privacyAccepted", event.target.checked)} />
              <span>He leído y acepto el <button type="button" className="inline-link">Aviso de Privacidad</button>.</span>
            </label>
            <label className="check-row">
              <input type="checkbox" checked={form.termsAccepted} onChange={(event) => update("termsAccepted", event.target.checked)} />
              <span>Acepto los <button type="button" className="inline-link">Términos y Condiciones</button> de uso de la plataforma.</span>
            </label>
            <button className="primary" onClick={submit} disabled={loading}>{loading ? "Creando acceso..." : "Crear acceso"}</button>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}
        {success && <p className="save-status success">{success}</p>}
        <div className="notice"><ShieldCheck size={18} /> El acceso se crea únicamente si el folio y el correo registrado coinciden con la información autorizada por COPARMEX Nuevo Laredo.</div>
        <div className="actions-row">
          <button className="secondary" onClick={onBack}>Volver al inicio</button>
        </div>
      </div>
    </section>
  );
}

function PasswordChangeScreen({ company, onChanged, onLogout }: { company: AdminCompany; onChanged: () => void; onLogout: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async () => {
    setError("");
    setSuccess("");

    if (!newPassword.trim()) {
      setError("Captura una nueva contraseña.");
      return;
    }

    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }

    setLoading(true);
    try {
      await changeCurrentUserPassword(newPassword);
      await updateCompany(company.id, {
        mustChangePassword: false,
        passwordChangedAt: new Date().toISOString(),
        temporaryPasswordUsed: true,
      });
      setSuccess("Tu contraseña fue actualizada correctamente.");
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("requires-recent-login")) {
        setError("Por seguridad, vuelve a iniciar sesión con tu contraseña temporal e intenta cambiarla nuevamente.");
        onLogout();
        return;
      }
      setError("No fue posible actualizar tu contraseña. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page narrow">
      <div className="login-card">
        <SectionTitle title="Crea tu nueva contraseña" subtitle="Por seguridad, cambia la contraseña temporal por una contraseña propia antes de continuar." />
        <PasswordField label="Nueva contraseña" value={newPassword} onChange={setNewPassword} />
        <PasswordField label="Confirmar nueva contraseña" value={confirmPassword} onChange={setConfirmPassword} />
        {error && <p className="form-error">{error}</p>}
        {success && <p className="save-status success">{success}</p>}
        <button className="primary" onClick={submit} disabled={loading}>{loading ? "Actualizando..." : "Guardar nueva contraseña"}</button>
      </div>
    </section>
  );
}

function CompanyLogin({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const submit = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await onLogin(email, password);
      setSuccess("Acceso validado. Cargando portal empresa...");
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Correo o contraseña incorrectos."));
    } finally {
      setLoading(false);
    }
  };
  const recoverPassword = async () => {
    setError("");
    setSuccess("");
    const emailToRecover = normalizeEmail(recoveryEmail || email);
    if (!emailToRecover || !isValidEmail(emailToRecover)) {
      setError("Captura un correo válido para recuperar tu contraseña.");
      return;
    }

    setRecoveryLoading(true);
    try {
      await sendRecoveryEmail(emailToRecover);
      setSuccess("Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.");
      setRecoveryOpen(false);
    } catch (err) {
      console.error("Password recovery failed", err);
      setSuccess("Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.");
      setRecoveryOpen(false);
    } finally {
      setRecoveryLoading(false);
    }
  };
  return (
    <section className="page narrow">
      <SectionTitle title="Acceso empresa" subtitle="Utiliza el correo autorizado por COPARMEX Nuevo Laredo." />
      <div className="login-card">
        <Field label="Correo" value={email} onChange={setEmail} transform="none" type="email" />
        <PasswordField label="Contraseña" value={password} onChange={setPassword} />
        {error && <p className="form-error">{error}</p>}
        {success && <p className="save-status success">{success}</p>}
        <button className="primary" onClick={submit} disabled={loading || !email || !password}>{loading ? "Validando acceso..." : "Ingresar al portal empresa"}</button>
        <button className="secondary" onClick={() => { setRecoveryOpen((current) => !current); setRecoveryEmail(email); }}>Olvidé mi contraseña</button>
        {recoveryOpen && (
          <div className="recovery-panel">
            <Field label="Correo registrado" value={recoveryEmail} onChange={setRecoveryEmail} transform="none" type="email" />
            <button className="primary" onClick={recoverPassword} disabled={recoveryLoading}>{recoveryLoading ? "Enviando..." : "Enviar instrucciones"}</button>
          </div>
        )}
      </div>
    </section>
  );
}

function AdminLogin({ onLogin }: { onLogin: (user: string, password: string) => boolean }) {
  const [user, setUser] = useState("admin@coparmexnld.org.mx");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  return (
    <section className="page narrow">
      <SectionTitle title="Acceso administrador" subtitle="Acceso exclusivo para personal autorizado de COPARMEX Nuevo Laredo." />
      <div className="login-card">
        <Field label="Usuario o correo" value={user} onChange={setUser} transform="none" />
        <PasswordField label="Contraseña" value={password} onChange={setPassword} />
        {error && <p className="form-error">{error}</p>}
        <button className="primary" onClick={() => onLogin(user, password) || setError("Usuario o contraseña incorrectos.")}>Ingresar al panel administrativo</button>
      </div>
    </section>
  );
}

function Register({ profile, setProfile, onNext }: { profile: CompanyProfile; setProfile: (profile: CompanyProfile) => void; onNext: () => void }) {
  const update = (key: keyof CompanyProfile, value: string) => setProfile({ ...profile, [key]: value });
  return (
    <section className="page narrow">
      <SectionTitle title="Identificación de empresa" subtitle="Estos datos permiten generar el reporte y construir estadística agregada." />
      <div className="form-grid">
        <Field label="Nombre de la empresa" value={profile.name} onChange={(value) => update("name", value)} />
        <Select label="Sector económico" value={profile.sector} onChange={(value) => update("sector", value)} options={["Servicios legales", "Logística y operación", "Administración y desarrollo empresarial", "Servicios notariales", "Comercio", "Construcción", "Industria", "Servicios profesionales", "Tecnología"]} />
        <Select label="Número aproximado de empleados" value={profile.employees} onChange={(value) => update("employees", value)} options={["1-10", "11-30", "31-50", "51-100", "101-250", "251+"]} />
        <Select label="Antigüedad de la empresa" value={profile.years} onChange={(value) => update("years", value)} options={["1-2 años", "3-5 años", "6-10 años", "Más de 10 años"]} />
        <Field label="Correo electrónico de contacto" value={profile.email} onChange={(value) => update("email", value)} transform="none" type="email" />
        <Field label="Teléfono" value={profile.phone} onChange={(value) => update("phone", value)} format="phone" maxLength={10} />
        <Field label="Representante o contacto principal" value={profile.representative} onChange={(value) => update("representative", value)} />
      </div>
      <div className="notice"><ShieldCheck size={18} /> La información se trata bajo confidencialidad, aviso de privacidad y uso agregado para indicadores regionales.</div>
      <button className="primary" onClick={onNext} disabled={!profile.name || !profile.email || !profile.representative}>Continuar al autodiagnóstico</button>
    </section>
  );
}

function Questionnaire(props: {
  currentModule: number;
  setCurrentModule: (index: number) => void;
  answers: AnswerState;
  setAnswers: (answers: AnswerState) => void;
  currentQuestions: typeof diagnosticQuestions;
  progress: number;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const sectionTopRef = useRef<HTMLElement | null>(null);
  const module = diagnosticModules[props.currentModule];
  const canAdvance = props.currentQuestions.every((question) => props.answers[question.id] !== undefined);
  const moduleScore = props.currentQuestions.reduce((sum, question) => sum + (props.answers[question.id]?.points ?? 0), 0);
  const modulePercentage = Math.round((moduleScore / module.maxPoints) * 100);
  const goToSection = (index: number) => {
    props.setCurrentModule(index);
    window.requestAnimationFrame(() => {
      sectionTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  return (
    <section className="page questionnaire-page" ref={sectionTopRef}>
      <div className="split-title questionnaire-heading">
        <div>
          <span className="section-progress-chip">Sección {props.currentModule + 1} de {diagnosticModules.length}</span>
          <SectionTitle title={module.title} subtitle={`${diagnosticICE.subtitle}. Puntaje de esta sección: ${moduleScore}/${module.maxPoints} (${modulePercentage}%).`} />
        </div>
        <ProgressRing value={props.progress} label="Avance del cuestionario" />
      </div>
      <div className="progress"><span style={{ width: `${props.progress}%` }} /></div>
      <div className="question-list">
        {props.currentQuestions.map((question) => (
          <article className="question-card" key={question.id}>
            <div className="question-card-top">
              <span className="question-id">{question.id}</span>
            </div>
            <div className="question-prompt"><h3>{question.text}</h3><QuestionHelp question={question} /></div>
            <div className="segmented">
              {[...question.options].sort((left, right) => answerDisplayOrder(left.label) - answerDisplayOrder(right.label)).map((option) => (
                <button
                  key={option.label}
                  className={`${answerVisualTone(option.label)} ${props.answers[question.id]?.label === option.label ? "active" : ""}`}
                  onClick={() => props.setAnswers({ ...props.answers, [question.id]: { label: option.label, points: option.points } })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="actions-row">
        <button className="secondary" onClick={props.onCancel}>Cancelar autodiagnóstico</button>
        <button className="secondary" disabled={props.currentModule === 0} onClick={() => goToSection(props.currentModule - 1)}>Anterior</button>
        {props.currentModule < diagnosticModules.length - 1 ? (
          <button className="primary" disabled={!canAdvance} onClick={() => goToSection(props.currentModule + 1)}>Siguiente sección</button>
        ) : (
          <button className="primary" disabled={!canAdvance} onClick={props.onComplete}>Generar resultado</button>
        )}
      </div>
    </section>
  );
}

function ResultScreen({ company, result, saveState, onPdf, onPortal, onRecommendations }: { company: CompanyProfile; result: DiagnosticResult; saveState: { loading: boolean; error: string; success: string }; onPdf: () => void; onPortal: () => void; onRecommendations: () => void }) {
  return (
    <section className="page printable">
      <ResultOverview company={company} result={result} />
      {(saveState.loading || saveState.error || saveState.success) && (
        <div className={`save-status ${saveState.error ? "error" : saveState.success ? "success" : ""}`}>
          {saveState.loading && "Guardando autodiagnóstico en el sistema..."}
          {saveState.error && saveState.error}
          {saveState.success && saveState.success}
        </div>
      )}
      <ModuleBars scores={result.moduleScores} />
      <ResponseBankInsights result={result} detail={false} />
      <DashboardRecommendationSummary result={result} />
      <div className="actions-row">
        <button className="primary" onClick={onRecommendations}>Ver recomendaciones puntuales</button>
        <button className="secondary" onClick={onPortal}>Volver al tablero</button>
      </div>
    </section>
  );
}

function CompanyPortal({ tab, setTab, company, result, loadingResult, resultError, onStart, onPdf }: { tab: CompanyTab; setTab: (tab: CompanyTab) => void; company: CompanyProfile; result: DiagnosticResult | null; loadingResult: boolean; resultError: string; onStart: () => void; onPdf: () => void }) {
  const tabs: CompanyTab[] = ["dashboard", "autodiagnostico", "resultado", "recomendaciones", "observaciones", "perfil"];
  return (
    <section className="portal">
      <Sidebar title="Portal empresa" items={tabs} active={tab} onSelect={setTab} />
      <div className="portal-content">
        {tab === "dashboard" && <CompanyDashboard company={company} result={result} loadingResult={loadingResult} resultError={resultError} onStart={onStart} onResults={() => setTab("resultado")} />}
        {tab === "autodiagnostico" && <PrepPanel onStart={onStart} hasResult={Boolean(result)} />}
        {tab === "resultado" && (result ? <ResultScreen company={company} result={result} saveState={{ loading: false, error: "", success: "" }} onPdf={onPdf} onPortal={() => setTab("dashboard")} onRecommendations={() => setTab("recomendaciones")} /> : <EmptyDiagnosticState company={company} onStart={onStart} loading={loadingResult} error={resultError} />)}
        {tab === "recomendaciones" && (result ? (
          <>
            <ResponseBankInsights result={result} title="Recomendaciones puntuales ICE" description="Detalle de hallazgos, riesgos, recomendaciones puntuales y posibles líneas de apoyo según el resultado del autodiagnóstico." showInstitutionalNote />
            <SpecializedEvaluationAction company={company} result={result} />
          </>
        ) : <EmptyDiagnosticState company={company} onStart={onStart} loading={loadingResult} error={resultError} />)}
        {tab === "observaciones" && <ObservationList companyId={company.id} companyName={company.name} authorRole="company" authorName={company.name} />}
        {tab === "perfil" && <ProfileCard company={company} result={result} />}
        {tab === "documentacion" && <DocumentsPanel companyId={company.id} />}
      </div>
    </section>
  );
}

function AdminPortal(props: { tab: AdminTab; setTab: (tab: AdminTab) => void; stats: any; selectedCompanyId: string; setSelectedCompanyId: (id: string) => void; setSelectedAdminCompany: (company: AdminCompany | null) => void; setView: (view: View) => void; onPdf: () => void; diagnostics: AdminDiagnosticRecord[]; diagnosticsLoading: boolean; diagnosticsError: string }) {
  const tabs: AdminTab[] = ["panel", "empresas", "estadisticas", "observaciones", "reportes", "configuracion"];
  const [intent, setIntent] = useState<AdminIntent>(null);
  const navigate = (tab: AdminTab, nextIntent: AdminIntent = null) => {
    setIntent(nextIntent);
    props.setTab(tab);
  };
  return (
    <section className="portal">
      <Sidebar title="Panel administrativo" items={tabs} active={props.tab} onSelect={(tab) => navigate(tab)} />
      <div className="portal-content">
        {props.tab === "panel" && <AdminDashboard stats={props.stats} diagnostics={props.diagnostics} onNavigate={navigate} />}
        {props.tab === "empresas" && <CompaniesTable intent={intent} diagnostics={props.diagnostics} setSelectedCompanyId={props.setSelectedCompanyId} setSelectedAdminCompany={props.setSelectedAdminCompany} setView={props.setView} onPdf={props.onPdf} />}
        {props.tab === "solicitudes" && <AccessRequestsPanel />}
        {props.tab === "estadisticas" && <RegionalStats stats={props.stats} compact />}
        {props.tab === "observaciones" && <AllObservations />}
        {props.tab === "reportes" && <ReportsPanelV3 intent={intent} diagnostics={props.diagnostics} />}
        {props.tab === "configuracion" && <ConfigPanel />}
      </div>
    </section>
  );
}

function AccessRequestsPanel() {
  const [requests, setRequests] = useState<AccessRequestRecord[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequestRecord | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = () => {
    setLoading(true);
    listAccessRequests()
      .then((items) => {
        setRequests(items);
        setError("");
      })
      .catch((err) => setError(getFriendlyErrorMessage(err, "No fue posible cargar solicitudes.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const updateRequestLocally = (updated: AccessRequestRecord) => {
    setRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelectedRequest(updated);
  };

  const rejectRequest = async (request: AccessRequestRecord) => {
    setMessage("");
    setError("");
    const reason = window.prompt("Motivo de rechazo (opcional):") || "";
    try {
      const extraData = { rejectionReason: reason, reviewedAt: new Date().toISOString() };
      const companyId = request.linkedCompanyId || request.folio?.trim().toUpperCase();
      if (companyId) {
        await updateCompany(companyId, {
          accessStatus: "rejected",
          status: "Rechazada",
          followUpStatus: "Rechazada",
        });
      }
      await updateAccessRequestStatus(request.id, "rejected", extraData);
      updateRequestLocally({ ...request, status: "rejected", ...extraData });
      setMessage("Solicitud rechazada.");
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "No fue posible actualizar la solicitud."));
    }
  };

  const approveRequest = async (request: AccessRequestRecord) => {
    setMessage("");
    setError("");

    if (!request.email) {
      setError("No se puede aprobar la solicitud sin correo de acceso.");
      return;
    }

    if (!request.companyName) {
      setError("No se puede aprobar la solicitud sin nombre de empresa.");
      return;
    }

    if (!request.phone && !request.contactName) {
      setError("Captura al menos teléfono o representante para aprobar la solicitud.");
      return;
    }

    try {
      const companyId = request.linkedCompanyId || request.folio?.trim().toUpperCase();
      if (!companyId) {
        setError("No encontramos la empresa vinculada a esta solicitud.");
        return;
      }
      await updateCompany(companyId, {
        accessStatus: "active",
        status: "Activa",
        followUpStatus: "Sin iniciar",
      });
      const extraData = {
        approvedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        linkedCompanyId: companyId,
      };
      await updateAccessRequestStatus(request.id, "approved", extraData);
      updateRequestLocally({ ...request, status: "approved", ...extraData });
      setMessage("Empresa autorizada correctamente. La cuenta de acceso ya puede ingresar.");
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "No fue posible aprobar la solicitud."));
    }
  };

  const filteredRequests = requests.filter((request) => (request.status || "pending") === filter);

  if (selectedRequest) {
    return (
      <AccessRequestDetail
        request={selectedRequest}
        error={error}
        message={message}
        onBack={() => setSelectedRequest(null)}
        onApprove={approveRequest}
        onReject={rejectRequest}
      />
    );
  }

  return (
    <>
      <SectionTitle title="Solicitudes de acceso" subtitle="Revisión administrativa de empresas que solicitan acceso al portal ICE." />
      <div className="filter-tabs">
        <button className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>Pendientes</button>
        <button className={filter === "approved" ? "active" : ""} onClick={() => setFilter("approved")}>Aprobadas</button>
        <button className={filter === "rejected" ? "active" : ""} onClick={() => setFilter("rejected")}>Rechazadas</button>
      </div>
      {loading && <div className="save-status">Cargando solicitudes...</div>}
      {error && <div className="save-status error">{error}</div>}
      {message && <div className="save-status success">{message}</div>}
      {!loading && !filteredRequests.length && <div className="card prepared"><FileText size={32} /><h2>Sin solicitudes en esta vista</h2><p>Las solicitudes se mostrarán conforme a su estado de revisión.</p></div>}
      <div className="request-grid">
        {filteredRequests.map((request) => (
          <article className="request-card" key={request.id}>
            <div className="company-card-head">
              <span>{request.folio || "Sin folio"}</span>
              <Badge tone={request.status === "approved" ? "verde" : request.status === "rejected" ? "rojo" : "amarillo"}>{request.status === "approved" ? "Aprobada" : request.status === "rejected" ? "Rechazada" : "Pendiente"}</Badge>
            </div>
            <h3>{request.companyName}</h3>
            <div className="mobile-detail-grid">
              <p><span>Contacto</span><strong>{request.contactName || "No capturado"}</strong></p>
              <p><span>Correo</span><strong>{request.email || "No capturado"}</strong></p>
              <p><span>Teléfono</span><strong>{request.phone || "No capturado"}</strong></p>
              <p><span>Sector</span><strong>{request.sector || "No capturado"}</strong></p>
            </div>
            {getRequestComments(request) && <p className="note"><strong>Observación</strong><span>{getRequestComments(request)}</span></p>}
            {request.status === "approved" && (
              <div className="approved-access-summary">
                <p><span>Correo de acceso</span><strong>{request.email || "No capturado"}</strong></p>
                <p><span>Estado</span><strong>Cuenta autorizada</strong></p>
                <small>La empresa ya puede ingresar con la contraseña que registró en su solicitud.</small>
              </div>
            )}
            <div className="actions-row">
              <button className="primary" onClick={() => setSelectedRequest(request)}>Revisar solicitud</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function AccessRequestDetail({ request, error, message, onBack, onApprove, onReject }: { request: AccessRequestRecord; error: string; message: string; onBack: () => void; onApprove: (request: AccessRequestRecord) => void; onReject: (request: AccessRequestRecord) => void }) {
  const status = request.status || "pending";
  return (
    <section className="request-detail">
      <button className="back-link" onClick={onBack}>← Volver a solicitudes</button>
      <SectionTitle title="Revisión de solicitud" subtitle="Detalle operativo para aprobar o rechazar el acceso de la empresa." />
      {error && <div className="save-status error">{error}</div>}
      {message && <div className="save-status success">{message}</div>}
      <div className="card request-detail-card">
        <div className="company-card-head">
          <span>{request.folio || "Sin folio"}</span>
          <Badge tone={status === "approved" ? "verde" : status === "rejected" ? "rojo" : "amarillo"}>{status === "approved" ? "Aprobada" : status === "rejected" ? "Rechazada" : "Pendiente"}</Badge>
        </div>
        <h3>{request.companyName}</h3>
        <div className="mobile-detail-grid">
          <p><span>Empresa</span><strong>{request.companyName || "No capturado"}</strong></p>
          <p><span>Folio</span><strong>{request.folio || "No capturado"}</strong></p>
          <p><span>RFC</span><strong>{request.rfc || "No capturado"}</strong></p>
          <p><span>Representante</span><strong>{request.contactName || "No capturado"}</strong></p>
          <p><span>Correo</span><strong>{request.email || "No capturado"}</strong></p>
          <p><span>Teléfono</span><strong>{request.phone || "No capturado"}</strong></p>
          <p><span>Sector</span><strong>{request.sector || "No capturado"}</strong></p>
          <p><span>Ciudad</span><strong>{request.city || "Nuevo Laredo"}</strong></p>
          <p><span>Estado</span><strong>{request.state || "Tamaulipas"}</strong></p>
        </div>
        {getRequestComments(request) && <p className="note"><strong>Comentarios</strong><span>{getRequestComments(request)}</span></p>}
        {status === "pending" && (
          <>
            <div className="notice"><ShieldCheck size={18} /> Esta acción autoriza la cuenta que la empresa creó al solicitar acceso.</div>
            <div className="actions-row">
              <button className="primary" onClick={() => onApprove(request)}>Autorizar acceso</button>
              <button className="secondary" onClick={() => onReject(request)}>Rechazar solicitud</button>
            </div>
          </>
        )}
        {status === "approved" && <AccessMessageBlock request={request} />}
        {status === "rejected" && (
          <div className="notice"><ShieldCheck size={18} /> Solicitud rechazada{request.rejectionReason ? `: ${request.rejectionReason}` : "."} Fecha de revisión: {formatRequestDate(request.reviewedAt)}</div>
        )}
      </div>
    </section>
  );
}

function AccessMessageBlock({ request }: { request: AccessRequestRecord }) {
  const [copied, setCopied] = useState(false);
  const message = getAccessMessage(request);
  const phone = normalizePhoneForWhatsapp(request.phone);
  const whatsappUrl = phone ? `https://wa.me/52${phone}?text=${encodeURIComponent(message)}` : "";
  const copyMessage = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
  };

  return (
    <div className="access-message">
      <h4>Cuenta autorizada</h4>
      <div className="access-credential"><span>Correo de acceso</span><strong>{request.email}</strong></div>
      <pre>{message}</pre>
      <div className="notice"><ShieldCheck size={18} /> La empresa ya puede ingresar con la contraseña que registró en su solicitud.</div>
      <div className="actions-row">
        <button className="secondary" onClick={copyMessage}>{copied ? "Mensaje copiado" : "Copiar mensaje"}</button>
        {whatsappUrl && <a className="primary" href={whatsappUrl} target="_blank" rel="noreferrer">Enviar por WhatsApp</a>}
      </div>
    </div>
  );
}

function AdminDashboard({ stats, diagnostics: adminDiagnostics, onNavigate }: { stats: any; diagnostics: AdminDiagnosticRecord[]; onNavigate: (tab: AdminTab, intent?: AdminIntent) => void }) {
  const [registeredCompanies, setRegisteredCompanies] = useState<AdminCompany[]>([]);
  useEffect(() => {
    let mounted = true;
    listCompanies()
      .then((items) => {
        if (mounted) setRegisteredCompanies(items.map((item) => mapCompanyRecord(item)));
      })
      .catch((error) => console.error("No fue posible consultar el padrón para el panel.", error));
    return () => {
      mounted = false;
    };
  }, []);
  const immediate = adminDiagnostics.filter((diagnostic) => getComplianceLevel(diagnostic.result.percentage).key === "immediate").length;
  const incomplete = registeredCompanies.filter((company) => !company.email).length;
  const totalCompanies = registeredCompanies.length;
  return (
    <>
      <SectionTitle title="Panel general COPARMEX" subtitle="Visión ejecutiva de empresas participantes, madurez empresarial y brechas regionales." />
      <div className="kpi-grid">
        <Kpi icon={<Building2 />} label="Total de empresas registradas" value={totalCompanies} />
        <Kpi icon={<CheckCircle2 />} label="Con autodiagnóstico" value={adminDiagnostics.length} />
        <Kpi icon={<ClipboardList />} label="Empresas pendientes" value={Math.max(totalCompanies - adminDiagnostics.length, 0)} />
        <Kpi icon={<BarChart3 />} label="Promedio general ICE" value={`${stats.average}%`} />
        <Kpi icon={<ShieldCheck />} label="Empresas en riesgo crítico" value={stats.highRisk} />
        <Kpi icon={<UserRoundCheck />} label="Atención inmediata" value={immediate} />
        <Kpi icon={<FileText />} label="Datos incompletos" value={incomplete} />
      </div>
      <div className="admin-quick-actions">
        <button className="secondary" onClick={() => onNavigate("empresas", "import-companies")}><Upload size={17} /> Importar empresas</button>
        <button className="secondary" onClick={() => onNavigate("empresas", "pending-companies")}><ClipboardList size={17} /> Ver empresas pendientes</button>
        <button className="secondary" onClick={() => onNavigate("reportes", "priority-report")}><ShieldCheck size={17} /> Ver atención prioritaria</button>
        <button className="secondary" onClick={() => onNavigate("reportes", "companies-report")}><FileSpreadsheet size={17} /> Reporte de empresas</button>
      </div>
      <div className="dashboard-grid">
        <ChartBlock title="Promedio por sección" data={stats.moduleAverages} />
        <LevelDistribution diagnostics={stats.diagnostics} />
        <ChartBlock title="Distribución por sector" data={stats.sectors.map((sector: any) => ({ title: sector.sector, value: sector.count * 10 }))} />
      </div>
    </>
  );
}

function CompanyDashboard({ company, result, loadingResult, resultError, onStart, onResults }: { company: CompanyProfile; result: DiagnosticResult | null; loadingResult: boolean; resultError: string; onStart: () => void; onResults: () => void }) {
  if (!result) {
    return <EmptyDiagnosticState company={company} onStart={onStart} loading={loadingResult} error={resultError} />;
  }

  return (
    <>
      <ResultOverview company={company} result={result} compact />
      <div className="kpi-grid company-kpi-grid">
        <Kpi icon={<LayoutDashboard />} label="Folio institucional" value={getCompanyFolio(company)} />
        <Kpi icon={<BarChart3 />} label="Cumplimiento global" value={`${result.percentage}%`} />
        <Kpi icon={<ShieldCheck />} label="Semáforo de cumplimiento" value={getComplianceLevel(result.percentage).label} />
        <Kpi icon={<FileText />} label="Observaciones nuevas" value={observations.filter((obs) => obs.companyId === company.id).length} />
      </div>
      <div className="company-dashboard-grid">
        <ModuleBars scores={result.moduleScores} compact />
        <DashboardRecommendationSummary result={result} />
      </div>
      <div className="actions-row">
        <button className="primary" onClick={onResults}>Ver resultados</button>
        <button className="secondary" onClick={onStart}>Realizar nuevo autodiagnóstico</button>
      </div>
    </>
  );
}

function DashboardRecommendationSummary({ result }: { result: DiagnosticResult }) {
  const sortedScores = [...result.moduleScores].sort((a, b) => a.percentage - b.percentage);
  const priorityScores = sortedScores.filter((score) => score.percentage < 50);
  const attentionScores = sortedScores.filter((score) => score.percentage >= 50 && score.percentage < 80);
  const focusScores = (priorityScores.length ? priorityScores : attentionScores).slice(0, 2);
  const items = focusScores.map((score) => {
    const prefix = score.percentage < 50 ? "Atender" : "Fortalecer";
    return `${prefix} ${score.title.toLowerCase()} (${score.percentage}%) con revisión documental y acciones de mejora.`;
  });

  if (priorityScores.length > 2) {
    items.push(`Atender ${priorityScores.length} secciones prioritarias desde Recomendaciones puntuales.`);
  } else if (!items.length) {
    items.push("Mantener evidencia corporativa actualizada y revisar periódicamente el índice.");
  } else {
    items.push("Consulta Recomendaciones puntuales para ver el detalle ejecutivo por sección.");
  }

  return <InsightList title="Acciones recomendadas" items={items.slice(0, 3)} />;
}

function EmptyDiagnosticState({ company, onStart, loading, error }: { company: CompanyProfile; onStart: () => void; loading: boolean; error: string }) {
  return (
    <div className="card prepared empty-diagnostic">
      <ClipboardList size={34} />
      <h2>La empresa aún no ha respondido el autodiagnóstico.</h2>
      <p>Cuando completes el autodiagnóstico, aquí se mostrará el porcentaje de cumplimiento, nivel de madurez, semáforo de cumplimiento y recomendaciones puntuales de {company.name}.</p>
      {loading && <div className="save-status">Consultando autodiagnósticos guardados...</div>}
      {error && <div className="save-status error">{error}</div>}
      <div className="kpi-grid">
        <Kpi icon={<LayoutDashboard />} label="Folio institucional" value={getCompanyFolio(company)} />
        <Kpi icon={<Building2 />} label="Empresa" value={company.name} />
        <Kpi icon={<FileText />} label="Sector" value={company.sector} />
        <Kpi icon={<ShieldCheck />} label="Estado" value={company.state} />
      </div>
      <button className="primary" onClick={onStart}>Iniciar autodiagnóstico</button>
    </div>
  );
}

function CompaniesTable({ intent, diagnostics: adminDiagnostics, setSelectedCompanyId, setSelectedAdminCompany, setView, onPdf }: { intent: AdminIntent; diagnostics: AdminDiagnosticRecord[]; setSelectedCompanyId: (id: string) => void; setSelectedAdminCompany: (company: AdminCompany | null) => void; setView: (view: View) => void; onPdf: () => void }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [firestoreCompanies, setFirestoreCompanies] = useState<AdminCompany[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companiesError, setCompaniesError] = useState("");
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [companySaveMessage, setCompanySaveMessage] = useState("");
  const [companySaveError, setCompanySaveError] = useState("");
  const [companiesRefreshKey, setCompaniesRefreshKey] = useState(0);
  const [companySearch, setCompanySearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [diagnosticFilter, setDiagnosticFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [companySort, setCompanySort] = useState("empresa");
  const [newCompany, setNewCompany] = useState({
    folio: "",
    name: "",
    rfc: "",
    sector: "Administración y desarrollo empresarial",
    representative: "",
    city: "Nuevo Laredo",
    state: "Tamaulipas",
    email: "",
    phone: "",
    followUpStatus: "Sin iniciar",
  });

  useEffect(() => {
    if (intent === "pending-companies") {
      setDiagnosticFilter("No");
      window.requestAnimationFrame(() => document.querySelector(".admin-filter-bar")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
    if (intent === "import-companies") {
      window.requestAnimationFrame(() => document.querySelector("#company-import-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [intent]);

  useEffect(() => {
    let mounted = true;
    setLoadingCompanies(true);
    listCompanies()
      .then((items) => {
        if (!mounted) return;
        setFirestoreCompanies(items.map((item) => mapCompanyRecord(item as Record<string, any>)));
        setCompaniesError("");
      })
      .catch(() => {
        if (mounted) setCompaniesError("No fue posible cargar empresas desde el sistema. Se muestra el listado institucional local.");
      })
      .finally(() => {
        if (mounted) setLoadingCompanies(false);
      });

    return () => {
      mounted = false;
    };
  }, [companiesRefreshKey]);


  const displayCompanies: AdminCompany[] = firestoreCompanies.length
    ? firestoreCompanies
    : companies.map((company) => ({ ...company, source: "mock" as const }));

  const companyRows = displayCompanies.map((company) => ({
    company,
    diagnostic: adminDiagnostics.find((item) => item.companyId === company.id),
    observations: observations.filter((observation) => observation.companyId === company.id).length,
  }));
  const visibleCompanyRows = companyRows
    .filter(({ company, diagnostic }) => {
      const query = companySearch.trim().toLocaleLowerCase("es-MX");
      const level = diagnostic ? getComplianceLevel(diagnostic.result.percentage).label : "Pendiente";
      const searchable = [company.name, getCompanyFolio(company), company.email, company.representative].join(" ").toLocaleLowerCase("es-MX");
      return (!query || searchable.includes(query)) &&
        (!levelFilter || level === levelFilter) &&
        (!diagnosticFilter || (diagnostic ? "Sí" : "No") === diagnosticFilter) &&
        (!sizeFilter || getCompanySize(company) === sizeFilter) &&
        (!sectorFilter || company.sector === sectorFilter);
    })
    .sort((left, right) => {
      const leftLevel = left.diagnostic ? getComplianceLevel(left.diagnostic.result.percentage).label : "Pendiente";
      const rightLevel = right.diagnostic ? getComplianceLevel(right.diagnostic.result.percentage).label : "Pendiente";
      const values: Record<string, [string | number, string | number]> = {
        folio: [getCompanyFolio(left.company), getCompanyFolio(right.company)],
        empresa: [left.company.name, right.company.name],
        porcentaje: [left.diagnostic?.result.percentage ?? -1, right.diagnostic?.result.percentage ?? -1],
        nivel: [leftLevel, rightLevel],
        empleados: [getCompanyEmployeeCount(left.company) ?? -1, getCompanyEmployeeCount(right.company) ?? -1],
        tamano: [getCompanySize(left.company), getCompanySize(right.company)],
        observaciones: [left.observations, right.observations],
        autodiagnostico: [left.diagnostic ? 1 : 0, right.diagnostic ? 1 : 0],
      };
      const [a, b] = values[companySort] ?? values.empresa;
      return typeof a === "number" && typeof b === "number" ? b - a : String(a).localeCompare(String(b), "es-MX");
    });
  const sectors = [...new Set(displayCompanies.map((company) => company.sector))].sort((a, b) => a.localeCompare(b, "es-MX"));
  const openDetail = (company: AdminCompany) => {
    setSelectedCompanyId(company.id);
    setSelectedAdminCompany(company);
    setView("detail");
    setOpenMenu(null);
  };
  const downloadReport = () => {
    setOpenMenu(null);
    onPdf();
  };
  const updateNewCompany = (field: keyof typeof newCompany, value: string) => {
    setNewCompany((current) => ({ ...current, [field]: value }));
  };

  const validateDuplicateFolio = async (folioValue = newCompany.folio) => {
    const folio = folioValue.trim().toUpperCase();
    if (!folio) return false;

    const localMatch = displayCompanies.find((company) => {
      const companyFolio = getCompanyFolio(company).trim().toUpperCase();
      const companyId = String(company.id || "").trim().toUpperCase();
      return companyFolio === folio || companyId === folio;
    });

    if (localMatch || folio === demoFolioCompany.folio) {
      setCompanySaveError(`Ya existe una empresa registrada con el folio ${folio}. Usa un folio diferente o revisa el registro existente.`);
      return true;
    }

    try {
      const existingCompany = await getCompanyByFolio(folio);
      if (existingCompany) {
        setCompanySaveError(`Ya existe una empresa registrada con el folio ${folio}. Usa un folio diferente o revisa el registro existente.`);
        return true;
      }
    } catch (error) {
      console.error("Folio lookup failed", error);
    }

    setCompanySaveError("");
    return false;
  };

  const saveNewCompany = async () => {
    const folio = newCompany.folio.trim().toUpperCase();
    const name = newCompany.name.trim();
    const email = normalizeEmail(newCompany.email);
    const rfc = normalizeRfcMoral(newCompany.rfc);
    const phone = normalizePhone(newCompany.phone);

    setCompanySaveMessage("");
    setCompanySaveError("");

    if (!folio || !name || !email) {
      setCompanySaveError("Captura folio, nombre de empresa y correo autorizado.");
      return;
    }

    if (!isValidEmail(email)) {
      setCompanySaveError("Captura un correo válido.");
      return;
    }

    if (rfc && !isValidRfcMoral(rfc)) {
      setCompanySaveError("El RFC debe tener formato de persona moral: 12 caracteres, por ejemplo ABC010101AB1.");
      return;
    }

    if (phone && phone.length !== 10) {
      setCompanySaveError("El teléfono debe tener 10 dígitos.");
      return;
    }

    setSavingCompany(true);
    try {
      const folioAlreadyExists = await validateDuplicateFolio(folio);
      if (folioAlreadyExists) return;

      await createCompany({
        id: folio,
        folio,
        name,
        rfc,
        sector: newCompany.sector,
        representative: newCompany.representative,
        primaryContactName: newCompany.representative,
        primaryContactEmail: email,
        primaryContactPhone: phone,
        allowedAccessEmails: [email],
        city: newCompany.city,
        state: newCompany.state,
        email,
        phone,
        followUpStatus: newCompany.followUpStatus,
        registeredAt: new Date().toISOString().slice(0, 10),
        interestedInAdvisory: false,
        status: "Activa",
        accessStatus: "available",
        accountCreated: false,
      });

      const created: AdminCompany = {
        id: folio,
        folio,
        name,
        sector: newCompany.sector,
        representative: newCompany.representative,
        city: newCompany.city,
        state: newCompany.state,
        email,
        phone,
        employees: "No especificado",
        years: "No especificado",
        registeredAt: new Date().toISOString().slice(0, 10),
        followUpStatus: newCompany.followUpStatus as CompanyProfile["followUpStatus"],
        interestedInAdvisory: false,
        source: "firestore",
      };

      setFirestoreCompanies((current) => [created, ...current.filter((company) => company.id !== folio)]);
      setCompanySaveMessage("Empresa registrada correctamente en el sistema.");
      setShowNewCompany(false);
      setNewCompany({
        folio: "",
        name: "",
        rfc: "",
        sector: "Administración y desarrollo empresarial",
        representative: "",
        city: "Nuevo Laredo",
        state: "Tamaulipas",
        email: "",
        phone: "",
        followUpStatus: "Sin iniciar",
      });
    } catch (error) {
      setCompanySaveError(getFriendlyErrorMessage(error, "No fue posible guardar la empresa."));
    } finally {
      setSavingCompany(false);
    }
  };

  return (
    <>
      <div className="section-title-row">
        <SectionTitle title="Empresas" subtitle="Padrón operativo para consulta, observaciones y reportes institucionales." />
        <button className="primary" onClick={() => setShowNewCompany((value) => !value)}>{showNewCompany ? "Cerrar formulario" : "Nueva empresa"}</button>
      </div>
      {loadingCompanies && <div className="save-status">Cargando empresas registradas...</div>}
      {companiesError && <div className="save-status error">{companiesError}</div>}
      {companySaveMessage && <div className="save-status success">{companySaveMessage}</div>}
      {companySaveError && <div className="save-status error">{companySaveError}</div>}
      {showNewCompany && (
        <div className="card company-form-card">
          <h3>Alta de empresa</h3>
          <div className="form-grid">
            <Field
              label="Folio"
              value={newCompany.folio}
              onChange={(value) => {
                updateNewCompany("folio", value);
                if (companySaveError.startsWith("Ya existe una empresa registrada con el folio")) setCompanySaveError("");
              }}
              onBlur={() => void validateDuplicateFolio()}
              onEnter={() => void validateDuplicateFolio()}
            />
            <Field label="Nombre de empresa" value={newCompany.name} onChange={(value) => updateNewCompany("name", value)} />
            <Field label="RFC moral" value={newCompany.rfc} onChange={(value) => updateNewCompany("rfc", value)} format="rfcMoral" maxLength={12} />
            <Select
              label="Sector"
              value={newCompany.sector}
              onChange={(value) => updateNewCompany("sector", value)}
              options={["Administración y desarrollo empresarial", "Servicios legales", "Logística y operación", "Servicios notariales", "Gestión empresarial", "Comercio", "Industria", "Servicios profesionales", "Tecnología"]}
            />
            <Field label="Representante" value={newCompany.representative} onChange={(value) => updateNewCompany("representative", value)} />
            <Field label="Correo autorizado" value={newCompany.email} onChange={(value) => updateNewCompany("email", value)} transform="none" type="email" />
            <Field label="Teléfono" value={newCompany.phone} onChange={(value) => updateNewCompany("phone", value)} format="phone" maxLength={10} />
            <Field label="Ciudad" value={newCompany.city} onChange={(value) => updateNewCompany("city", value)} />
            <Field label="Estado" value={newCompany.state} onChange={(value) => updateNewCompany("state", value)} />
          </div>
          <div className="actions-row">
            <button className="primary" onClick={saveNewCompany} disabled={savingCompany}>{savingCompany ? "Guardando..." : "Guardar empresa"}</button>
            <button className="secondary" onClick={() => setShowNewCompany(false)}>Cancelar</button>
          </div>
        </div>
      )}
      <CompanyImportPanel existingCompanies={displayCompanies} onImported={() => setCompaniesRefreshKey((current) => current + 1)} />
      <div className="card admin-filter-bar">
        <label className="field"><span>Buscar empresa</span><input value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} placeholder="Empresa, folio, correo o representante" /></label>
        <Select label="Nivel" value={levelFilter} onChange={setLevelFilter} options={["", "Madura", "Área de oportunidad", "Atención inmediata", "Riesgo crítico", "Pendiente"]} />
        <Select label="Autodiagnóstico" value={diagnosticFilter} onChange={setDiagnosticFilter} options={["", "Sí", "No"]} />
        <Select label="Tamaño" value={sizeFilter} onChange={setSizeFilter} options={["", "Micro", "Pequeña", "Mediana", "Grande", "No calculado"]} />
        <Select label="Sector" value={sectorFilter} onChange={setSectorFilter} options={["", ...sectors]} />
        <Select label="Ordenar por" value={companySort} onChange={setCompanySort} options={["empresa", "folio", "porcentaje", "nivel", "empleados", "tamano", "autodiagnostico", "observaciones"]} />
      </div>
      <p className="admin-list-count">{visibleCompanyRows.length} empresas visibles de {companyRows.length}</p>
      <div className="admin-company-table">
        <div className="admin-company-row admin-company-head">
          <span>Folio</span>
          <span>Empresa</span>
          <span>Sector</span>
          <span>Representante</span>
          <span>Correo</span>
          <span>Empleados</span>
          <span>Tamaño</span>
          <span>Autodiagnóstico</span>
          <span>Nivel</span>
          <span>%</span>
          <span>Semáforo de cumplimiento</span>
          <span>Observaciones</span>
          <span>Acciones</span>
        </div>
        {visibleCompanyRows.map(({ company, diagnostic, observations: companyObservations }) => (
          <div className="admin-company-row" key={company.id}>
            <span>{getCompanyFolio(company)}</span>
            <span className="company-cell">{company.name}</span>
            <span>{company.sector}</span>
            <span>{company.representative}</span>
            <span>{company.email || "Sin correo"}</span>
            <span>{getCompanyEmployeeCount(company) ?? "-"}</span>
            <span>{getCompanySize(company)}</span>
            <span><span className={`report-status ${diagnostic ? "yes" : "no"}`}>{diagnostic ? "Sí" : "No"}</span></span>
            <span>{diagnostic?.result?.maturity.title ?? "Pendiente"}</span>
            <span>{diagnostic?.result?.percentage ?? "-"}%</span>
            <span><Badge tone={diagnostic?.result ? getComplianceLevel(diagnostic.result.percentage).color : "amarillo"}>{diagnostic?.result ? getComplianceLevel(diagnostic.result.percentage).label : "Pendiente"}</Badge></span>
            <span>{companyObservations}</span>
            <span className="table-actions">
              <ActionMenu
                companyId={company.id}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
                onDetail={() => openDetail(company)}
                onReport={downloadReport}
                onObservation={() => openDetail(company)}
              />
            </span>
          </div>
        ))}
      </div>
      <div className="company-card-list">
        {visibleCompanyRows.map(({ company, diagnostic, observations: companyObservations }) => (
          <article className="company-admin-card" key={company.id}>
            <div className="company-card-head">
              <span>{getCompanyFolio(company)}</span>
              <ActionMenu
                companyId={company.id}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
                onDetail={() => openDetail(company)}
                onReport={downloadReport}
                onObservation={() => openDetail(company)}
              />
            </div>
            <h3>{company.name}</h3>
            <div className="mobile-detail-grid">
              <p><span>Sector</span><strong>{company.sector}</strong></p>
              <p><span>Representante</span><strong>{company.representative}</strong></p>
              <p><span>Correo</span><strong>{company.email || "Sin correo"}</strong></p>
              <p><span>Empleados</span><strong>{getCompanyEmployeeCount(company) ?? "No disponible"}</strong></p>
              <p><span>Tamaño</span><strong>{getCompanySize(company)}</strong></p>
              <p><span>Autodiagnóstico</span><span className={`report-status ${diagnostic ? "yes" : "no"}`}>{diagnostic ? "Sí" : "No"}</span></p>
              <p><span>Nivel</span><strong>{diagnostic?.result?.maturity.title ?? "Pendiente"}</strong></p>
              <p><span>Porcentaje</span><strong>{diagnostic?.result?.percentage ?? "-"}%</strong></p>
              <p><span>Semáforo de cumplimiento</span><Badge tone={diagnostic?.result ? getComplianceLevel(diagnostic.result.percentage).color : "amarillo"}>{diagnostic?.result ? getComplianceLevel(diagnostic.result.percentage).label : "Pendiente"}</Badge></p>
              <p><span>Observaciones</span><strong>{companyObservations}</strong></p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function CompanyImportPanel({ existingCompanies, onImported }: { existingCompanies: AdminCompany[]; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CompanyImportRow[]>([]);
  const [removedRows, setRemovedRows] = useState<CompanyImportRow[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>("omit");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [resultMessage, setResultMessage] = useState("");

  const previewSummary = {
    total: rows.length,
    valid: rows.filter((row) => row.status === "Válida").length,
    warnings: rows.filter((row) => row.status === "Advertencia").length,
    errors: rows.filter((row) => row.status === "Error").length,
    duplicates: rows.filter((row) => row.status === "Posible duplicada").length,
    estimatedSizes: rows.filter((row) => row.tamanoEmpresa).length,
    ready: rows.filter((row) => row.status === "Válida" || row.status === "Advertencia").length,
  };

  const previewFile = async () => {
    if (!file) {
      setError("Selecciona un archivo Excel o CSV para generar la vista previa.");
      return;
    }
    setLoadingPreview(true);
    setError("");
    setResultMessage("");
    try {
      const parsedRows = await parseCompanyImportFile(await file.arrayBuffer(), existingCompanies as unknown as Record<string, unknown>[]);
      setRows(parsedRows);
      setRemovedRows([]);
      if (!parsedRows.length) setError("No se encontraron filas con información real en el archivo.");
    } catch (previewError) {
      console.error("Company import preview failed", previewError);
      setRows([]);
      setError("No fue posible leer el archivo. Verifica que sea un Excel o CSV válido.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const removePreviewRow = (rowToRemove: CompanyImportRow) => {
    setRows((current) => current.filter((row) => row !== rowToRemove));
    setRemovedRows((current) => [...current, rowToRemove]);
  };

  const importCompanies = async () => {
    const importableRows = rows.filter((row) =>
      row.status !== "Error" && (
        row.status !== "Posible duplicada" ||
        duplicateMode === "import" ||
        (duplicateMode === "update" && Boolean(row.duplicateCompanyId))
      ),
    );
    if (!importableRows.length) {
      setError("No hay empresas nuevas disponibles para importar con la selección actual.");
      return;
    }
    if (!window.confirm(`Se importarán ${importableRows.length} empresas. ¿Deseas continuar?`)) return;

    setImporting(true);
    setError("");
    setResultMessage("");
    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const row of importableRows) {
      const payload = {
        folio: row.numeroSocio,
        numeroSocio: row.numeroSocio,
        name: row.nombreEmpresa,
        nombreEmpresa: row.nombreEmpresa,
        representative: row.representante,
        primaryContactName: row.representante,
        email: row.correo,
        correo: row.correo,
        primaryContactEmail: row.correo,
        allowedAccessEmails: row.correo ? [row.correo] : [],
        rfc: row.rfc,
        numeroEmpleados: row.numeroEmpleados,
        tamanoEmpresa: row.tamanoEmpresa,
        tamanoEmpresaFuente: row.tamanoEmpresaFuente,
        consecutivoImportacion: row.consecutivoImportacion,
        sector: "No especificado",
        city: "Nuevo Laredo",
        state: "Tamaulipas",
        status: "Activa",
        accessStatus: "available",
        accountCreated: false,
        followUpStatus: "Sin iniciar",
        source: "importacion_excel",
      };

      try {
        if (row.status === "Posible duplicada" && duplicateMode === "update" && row.duplicateCompanyId) {
          await updateCompany(row.duplicateCompanyId, payload);
          updated += 1;
        } else {
          await createCompany(payload);
          imported += 1;
        }
      } catch (importError) {
        console.error("Company import row failed", importError);
        errors += 1;
      }
    }

    setImporting(false);
    const omitted = rows.length - importableRows.length;
    setResultMessage(`Importación finalizada. ${imported} empresas importadas, ${updated} actualizadas, ${omitted} omitidas, ${previewSummary.warnings} con advertencia, ${previewSummary.duplicates} duplicados detectados y ${errors} errores.`);
    onImported();
  };

  return (
    <section className="card company-import-card" id="company-import-panel">
      <div className="section-title-row company-import-heading">
        <div>
          <span className="eyebrow">Carga masiva</span>
          <h3>Importar empresas</h3>
          <p>Selecciona la base de socios COPARMEX, revisa la vista previa y confirma antes de guardar.</p>
        </div>
        <FileSpreadsheet size={32} />
      </div>
      <div className="company-import-controls">
        <label className="file-picker">
          <Upload size={18} />
          <span>{file?.name || "Seleccionar archivo"}</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setRows([]);
              setRemovedRows([]);
              setError("");
              setResultMessage("");
            }}
          />
        </label>
        <small>Acepta archivos .xlsx, .xls o .csv. Solo se procesan filas con valores reales.</small>
        <button className="secondary" type="button" onClick={previewFile} disabled={loadingPreview || !file}>
          {loadingPreview ? "Leyendo archivo..." : "Previsualizar"}
        </button>
      </div>
      {error && <div className="save-status error">{error}</div>}
      {resultMessage && <div className="save-status success">{resultMessage}</div>}
      {rows.length > 0 && (
        <>
          <div className="import-summary-grid">
            <ImportSummary label="Filas detectadas" value={previewSummary.total} />
            <ImportSummary label="Empresas válidas" value={previewSummary.valid} tone="green" />
            <ImportSummary label="Advertencias" value={previewSummary.warnings} tone="yellow" />
            <ImportSummary label="Errores" value={previewSummary.errors} tone="red" />
            <ImportSummary label="Posibles duplicados" value={previewSummary.duplicates} tone="orange" />
            <ImportSummary label="Listas para importar" value={previewSummary.ready} />
          </div>
          {removedRows.length > 0 && (
            <details className="removed-import-rows">
              <summary>Filas quitadas <span>{removedRows.length}</span></summary>
              <div>
                {removedRows.map((row) => (
                  <p key={`removed-${row.rowNumber}-${row.numeroSocio}`}>
                    <strong>{row.numeroSocio || "Sin número"} · {row.nombreEmpresa || "Sin nombre"}</strong>
                    <span>{row.correo || "Sin correo"} · Estado original: {row.status}</span>
                  </p>
                ))}
              </div>
            </details>
          )}
          <div className="import-options">
            <label className="field">
              <span>Tratamiento de posibles duplicados</span>
              <select value={duplicateMode} onChange={(event) => setDuplicateMode(event.target.value as DuplicateMode)}>
                <option value="omit">Omitir duplicados</option>
                <option value="update">Actualizar empresa existente</option>
                <option value="import">Importar de todos modos</option>
              </select>
            </label>
          </div>
          <div className="import-preview-wrap">
            <table className="import-preview-table">
              <thead><tr><th>No. socio</th><th>Empresa</th><th>Representante</th><th>Correo</th><th>Empleados</th><th>Tamaño estimado</th><th>Estado</th><th>Quitar</th></tr></thead>
              <tbody>
                {rows.slice(0, 100).map((row) => (
                  <tr key={`${row.rowNumber}-${row.numeroSocio}-${row.nombreEmpresa}`}>
                    <td>{row.numeroSocio || "Sin número"}</td>
                    <td>{row.nombreEmpresa || "Sin nombre"}</td>
                    <td>{row.representante || "No capturado"}</td>
                    <td>{row.correo || "Sin correo"}</td>
                    <td>{row.numeroEmpleados ?? "No disponible"}</td>
                    <td>{row.tamanoEmpresa || "No calculado"}</td>
                    <td><span className={`import-status ${row.status.toLocaleLowerCase("es-MX").replace(/\s/g, "-")}`}>{row.status}</span><small>{row.messages.join(". ")}</small></td>
                    <td><button className="remove-import-row" type="button" onClick={() => removePreviewRow(row)} aria-label={`Quitar ${row.nombreEmpresa || "fila"}`} title="Quitar fila"><X size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 100 && <p className="muted">La vista previa muestra las primeras 100 filas. Se procesarán todas las filas válidas.</p>}
          <button className="primary" type="button" onClick={importCompanies} disabled={importing}>
            {importing ? "Importando empresas..." : "Importar empresas"}
          </button>
        </>
      )}
    </section>
  );
}

function ImportSummary({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return <div className={`import-summary ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function ActionMenu({ companyId, openMenu, setOpenMenu, onDetail, onReport, onObservation }: { companyId: string; openMenu: string | null; setOpenMenu: (id: string | null) => void; onDetail: () => void; onReport: () => void; onObservation: () => void }) {
  const isOpen = openMenu === companyId;
  return (
    <div className="action-menu-wrap">
      <button className="kebab-action" aria-label="Más acciones" title="Más acciones" onClick={() => setOpenMenu(isOpen ? null : companyId)}>⋯</button>
      {isOpen && (
        <div className="action-menu">
          <button onClick={onDetail}><Eye size={15} /> Ver detalle</button>
          <button onClick={onObservation}><MessageSquarePlus size={15} /> Agregar observación</button>
        </div>
      )}
    </div>
  );
}

function CompanyDetail({ company, result, onBack, onPdf }: { company: CompanyProfile; result: DiagnosticResult | null; onBack: () => void; onPdf: () => void }) {
  return (
    <section className="page">
      <button className="back-link" onClick={onBack}>← Volver a empresas</button>
      {result ? <ResultOverview company={company} result={result} /> : <SectionTitle title={company.name} subtitle="Esta empresa aún no tiene un autodiagnóstico guardado." />}
      {result ? <ProfileCard company={company} result={result} hideFollowUp /> : <div className="card prepared"><ClipboardList size={30} /><h2>Autodiagnóstico pendiente</h2><p>Los resultados y recomendaciones puntuales aparecerán cuando la empresa complete su autodiagnóstico.</p></div>}
      {result && <ModuleBars scores={result.moduleScores} />}
      {result && <ResponseBankInsights result={result} title="Lectura institucional ICE" description="Esta lectura permite identificar secciones críticas, riesgos y posibles líneas de atención para la empresa." />}
      <TwoColumns left={<ObservationList companyId={company.id} companyName={company.name} authorRole="admin" authorName="Administrador COPARMEX" />} right={<ActivityPanel companyId={company.id} />} />
      <DocumentsPanel companyId={company.id} />
    </section>
  );
}

function RegionalStats({ stats, compact = false }: { stats: any; compact?: boolean }) {
  const completed = stats.diagnostics.length;
  const mature = stats.diagnostics.filter((diagnostic: AdminDiagnosticRecord) => getComplianceLevel(diagnostic.result.percentage).key === "mature").length;
  const opportunity = stats.diagnostics.filter((diagnostic: AdminDiagnosticRecord) => getComplianceLevel(diagnostic.result.percentage).key === "opportunity").length;
  const priority = stats.diagnostics.filter((diagnostic: AdminDiagnosticRecord) => diagnostic.result.percentage < 70).length;
  return (
    <section className={compact ? "" : "page"}>
      <SectionTitle title="Índice de Competitividad Empresarial de Nuevo Laredo" subtitle={platformContentConfig.regionalIndicator.description} />
      <div className="kpi-grid">
        <Kpi icon={<CheckCircle2 />} label="Autodiagnósticos reales" value={completed} />
        <Kpi icon={<BarChart3 />} label="Promedio general ICE" value={`${stats.average}%`} />
        <Kpi icon={<ShieldCheck />} label="Empresas prioritarias" value={priority} />
        <Kpi icon={<UserRoundCheck />} label="Maduras / oportunidad" value={mature + opportunity} />
      </div>
      <div className="dashboard-grid">
        <ChartBlock title="Promedio de cumplimiento por sector" data={stats.sectors.map((sector: any) => ({ title: sector.sector, value: sector.average }))} />
        <ChartBlock title="Secciones con menor calificación" data={[...stats.moduleAverages].sort((a, b) => a.value - b.value).slice(0, 5)} />
        <LevelDistribution diagnostics={stats.diagnostics} />
      </div>
    </section>
  );
}

function ResultOverview({ company, result, compact = false }: { company: CompanyProfile; result: DiagnosticResult; compact?: boolean }) {
  return (
    <div className="result-overview">
      <ResultHeader company={company} result={result} compact={compact} />
      <div className="standalone-traffic-light">
        <ComplianceTrafficLight result={result} compact={compact} />
      </div>
    </div>
  );
}

function ResultHeader({ company, result, compact = false }: { company: CompanyProfile; result: DiagnosticResult; compact?: boolean }) {
  const currentLevel = getComplianceLevel(result.percentage);
  return (
    <div className="result-header">
      <div>
        <span className="eyebrow">{company.name || "Empresa participante"}</span>
        <h2>{compact ? "Tablero de cumplimiento" : "Resultado del autodiagnóstico"}</h2>
        <p>{currentLevel.longText}</p>
      </div>
    </div>
  );
}

function ComplianceTrafficLight({ result, compact = false }: { result: DiagnosticResult; compact?: boolean }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const isCurrentModel = result.scoringVersion === "4-level-2026";
  const activeLevel = getComplianceLevel(result.percentage);
  const selectedLevel = platformContentConfig.trafficLight.find((level) => level.key === selectedKey);

  return (
    <div className={`compliance-traffic-light ${compact ? "compact" : ""}`}>
      <div className="traffic-light-copy">
        <span>Semáforo de cumplimiento</span>
        <strong>{result.percentage}%</strong>
        <small>Nivel actual: {activeLevel.label}</small>
      </div>
      <div className="traffic-light-vertical" aria-label={`Semáforo de cumplimiento: ${activeLevel.label}`}>
        {platformContentConfig.trafficLight.map((level) => {
          const active = level.key === activeLevel.key;
          return (
            <button
              type="button"
              key={level.key}
              className={`traffic-light-lamp ${level.color} ${active ? "is-active" : "is-off"}`}
              aria-label={level.shortText}
              aria-pressed={selectedKey === level.key}
              title={level.shortText}
              onClick={() => setSelectedKey((current) => current === level.key ? null : level.key)}
            >
              <i />
              <span>{level.label}</span>
            </button>
          );
        })}
      </div>
      <div className="traffic-light-help">
        <strong>{selectedLevel ? selectedLevel.label : "Por qué se activa"}</strong>
        <span>
          {selectedLevel
            ? `${selectedLevel.shortText} ${selectedLevel.longText}`
            : `El cumplimiento global es ${result.percentage}%, dentro del rango de ${activeLevel.min}% a ${activeLevel.max}%. ${activeLevel.longText}`}
        </span>
      </div>
      {!isCurrentModel && (
        <p className="historical-classification">
          <strong>Clasificación histórica</strong>
          <span>{result.maturity.title}</span>
        </p>
      )}
    </div>
  );
}

function ModuleBars({ scores, compact = false }: { scores: DiagnosticResult["moduleScores"]; compact?: boolean }) {
  return (
    <div className={`card module-results-card ${compact ? "compact" : ""}`}>
      <h3>Resultados por sección</h3>
      <div className="module-result-list">
        {scores.map((score) => {
          const level = getComplianceLevel(score.percentage);
          return (
            <div className="module-result-row" key={score.moduleId}>
              <div className="module-result-heading">
                <strong className="module-result-title">{moduleIcon(score.moduleId)} {score.title}</strong>
                <div className="module-result-meta">
                  <span className="percentage-chip">{score.percentage}%</span>
                  <span className={`maturity-chip ${level.color}`}>{level.label}</span>
                </div>
              </div>
              <div className="bar maturity-bar"><i style={{ width: `${score.percentage}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResponseBankInsights({ result, title = "Lectura ICE por secciones", description, detail = true, showInstitutionalNote = false }: { result: DiagnosticResult; title?: string; description?: string; detail?: boolean; showInstitutionalNote?: boolean }) {
  const scoresWithBank = result.moduleScores.map((score) => ({
    score,
    bank: diagnosticResponseBank.find((item) => item.moduleId === score.moduleId),
  }));
  const strongAreas = scoresWithBank.filter((item) => item.score.percentage >= 80);
  const attentionAreas = scoresWithBank.filter((item) => item.score.percentage >= 50 && item.score.percentage < 80);
  const priorityAreas = scoresWithBank.filter((item) => item.score.percentage < 50);

  return (
    <div className="response-bank">
      <div className="card">
        <h3>{title}</h3>
        {description && <p className="response-bank-intro">{description}</p>}
        <div className="area-summary-grid">
          <div className="area-summary-card strong">
            <div className="area-summary-card-head">
              <strong>Secciones fuertes</strong>
              <b>{strongAreas.length}</b>
            </div>
            <p>Capacidades que muestran una base institucional favorable.</p>
            {strongAreas.length ? <ul>{strongAreas.slice(0, 3).map(({ score }) => <li key={score.moduleId}>{score.title}</li>)}</ul> : <span>Sin secciones en rango fuerte.</span>}
          </div>
          <div className="area-summary-card attention">
            <div className="area-summary-card-head">
              <strong>Secciones de atención</strong>
              <b>{attentionAreas.length}</b>
            </div>
            <p>Aspectos que conviene fortalecer para prevenir brechas.</p>
            {attentionAreas.length ? <ul>{attentionAreas.slice(0, 3).map(({ score }) => <li key={score.moduleId}>{score.title}</li>)}</ul> : <span>Sin secciones en rango de atención.</span>}
          </div>
          <div className="area-summary-card priority">
            <div className="area-summary-card-head">
              <strong>Secciones prioritarias</strong>
              <b>{priorityAreas.length}</b>
            </div>
            <p>Secciones prioritarias que requieren atención por su nivel de riesgo.</p>
            {priorityAreas.length ? <ul>{priorityAreas.slice(0, 3).map(({ score }) => <li key={score.moduleId}>{score.title}</li>)}</ul> : <span>Sin secciones prioritarias detectadas.</span>}
          </div>
        </div>
      </div>

      {detail && (
        <div className="section-insight-list">
          {scoresWithBank.filter(({ bank }) => bank).map(({ score, bank }, sectionIndex) => {
            const status = getComplianceLevel(score.percentage);
            const isMature = status.key === "mature";
            const detectedContent = isMature
              ? {
                  findings: ["La empresa acredita un nivel adecuado de cumplimiento y organización en esta sección con base en las respuestas del autodiagnóstico."],
                  implications: ["La documentación y prácticas actuales favorecen la continuidad, claridad y capacidad de respuesta de la empresa."],
                  risks: ["No se identifican brechas críticas en esta sección. Conviene conservar evidencia vigente para sostener este nivel."],
                }
              : { findings: bank!.findings, implications: bank!.businessImplications, risks: bank!.risks };
            const recommendationContent = isMature
              ? {
                  recommendations: ["Mantener la documentación actualizada y revisar periódicamente que siga reflejando la realidad actual de la empresa."],
                  services: ["Revisión preventiva periódica y conservación ordenada de evidencia."],
                  providers: ["Responsable interno de cumplimiento y asesores especializados cuando exista un cambio relevante."],
                }
              : { recommendations: bank!.recommendations, services: bank!.suggestedServices, providers: bank!.suggestedProviderTypes };
            return (
              <section className={`section-insight-group ${status.color}`} key={score.moduleId}>
                <header className="section-insight-group-header">
                  <span className={`section-status-dot ${status.color}`} aria-hidden="true" />
                  <span className="section-insight-heading">
                    <small>Sección {sectionIndex + 1}</small>
                    <strong className="module-result-title">{moduleIcon(score.moduleId)} {score.title}</strong>
                    <small>{score.percentage}% · {status.label}</small>
                  </span>
                </header>
                <div className="section-insight-accordions">
                  <SectionInsightAccordion
                    number={1}
                    title="Lo que se detectó"
                    description="Qué se encontró y por qué puede afectar a la empresa."
                  >
                    <div className="section-insight-content diagnosis-layout">
                      <SectionInsightList title="Hallazgo" items={detectedContent.findings} />
                      <SectionInsightList title="Implicación empresarial" items={detectedContent.implications} />
                      <SectionInsightList title="Riesgo / compliance" items={detectedContent.risks} wide />
                    </div>
                  </SectionInsightAccordion>
                  <SectionInsightAccordion
                    number={2}
                    title="Lo que se recomienda"
                    description="Qué debería hacerse primero para regularizar o mantener la situación."
                  >
                    <div className="section-insight-content action-layout">
                      <SectionInsightList title="Recomendación puntual" items={recommendationContent.recommendations} wide />
                      <SectionInsightList title="Acción sugerida" items={recommendationContent.services} />
                      <SectionInsightList title="Prioridad" items={[isMature ? "Conservación preventiva." : status.label]} />
                      <SectionInsightList title="Responsable sugerido" items={recommendationContent.providers} wide />
                    </div>
                  </SectionInsightAccordion>
                  <SectionInsightAccordion
                    number={3}
                    title="Sustento / referencia"
                    description="Marco normativo, mejores prácticas y documentos relacionados."
                  >
                    <div className="section-insight-content">
                      <SectionInsightList title="Marco normativo relacionado" items={bank!.legalFramework} wide />
                      <SectionInsightList title="Mejores prácticas o documentos relacionados" items={isMature ? ["Conservar evidencia documental y actualizarla cuando exista algún cambio relevante."] : bank!.suggestedServices} wide />
                    </div>
                  </SectionInsightAccordion>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {showInstitutionalNote && <p className="institutional-note">{platformContentConfig.generalTexts.coparmexSupport}</p>}
    </div>
  );
}

function SpecializedEvaluationAction({ company, result }: { company: CompanyProfile; result: DiagnosticResult }) {
  const relevantSections = result.moduleScores
    .filter((score) => score.percentage < 80)
    .map((score) => `${score.title}: ${score.percentage}%`)
    .join("\n") || "Sin secciones prioritarias o de atención.";
  const level = getComplianceLevel(result.percentage).label;
  const subject = `Solicitud de Evaluación Especializada ICE - ${company.name}`;
  const body = `COPARMEX Nuevo Laredo:

Por medio del presente, la empresa ${company.name}, folio ${getCompanyFolio(company)}, solicita iniciar el proceso de Evaluación Especializada derivado de los resultados obtenidos en el Índice de Competitividad Empresarial.

Datos generales:
Empresa: ${company.name}
Folio: ${getCompanyFolio(company)}
Representante: ${company.representative || "No capturado"}
Correo: ${company.email || "No capturado"}
Resultado ICE: ${level} - ${result.percentage}%

Secciones prioritarias o de atención:
${relevantSections}

Quedamos atentos a la documentación requerida para continuar con el proceso.

Atentamente,
${company.name}`;
  const mailto = `mailto:admin@coparmexnld.org.mx?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <section className="card specialized-evaluation">
      <div>
        <span className="eyebrow">Acompañamiento institucional</span>
        <h3>Evaluación especializada</h3>
        <p>COPARMEX recibirá la solicitud y posteriormente indicará la documentación necesaria o la ruta de atención correspondiente.</p>
      </div>
      <a className="primary button-link" href={mailto}><Mail size={18} /> Solicitar evaluación especializada</a>
    </section>
  );
}

function SectionInsightAccordion({ number, title, description, children }: { number: number; title: string; description: string; children: React.ReactNode }) {
  return (
    <details className="section-layer">
      <summary>
        <b>{number}</b>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <ChevronDown size={18} />
      </summary>
      {children}
    </details>
  );
}

function SectionInsightList({ title, items, wide = false }: { title: string; items: string[]; wide?: boolean }) {
  return (
    <div className={`section-insight-item ${wide ? "wide" : ""}`}>
      <strong>{title}</strong>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="section-title"><span className="eyebrow">COPARMEX Nuevo Laredo</span><h2>{title}</h2><p>{subtitle}</p></div>;
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return <div className="kpi">{icon}<span>{label}</span><strong>{value}</strong></div>;
}

function Sidebar<T extends string>({ title, items, active, onSelect }: { title: string; items: T[]; active: T; onSelect: (item: T) => void }) {
  return <aside className="sidebar"><h2>{title}</h2>{items.map((item) => <button key={item} className={active === item ? "active" : ""} onClick={() => onSelect(item)}>{labelize(item)}</button>)}</aside>;
}

function labelize(value: string) {
  const labels: Record<string, string> = { dashboard: "Inicio", autodiagnostico: "Autodiagnóstico", recomendaciones: "Recomendaciones puntuales", documentacion: "Documentación", estadisticas: "Estadísticas", configuracion: "Configuración", diagnosticos: "Autodiagnósticos", solicitudes: "Solicitudes" };
  return labels[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}

function QuestionHelp({ question }: { question: { id: string; helpShort?: string; helpLong?: string } }) {
  const [open, setOpen] = useState(false);
  const configured = platformContentConfig.questionHelps.find((help) => help.id === question.id);
  const shortText = question.helpShort ?? configured?.shortText;
  const longText = question.helpLong ?? configured?.longText;
  if (!shortText) return null;

  return (
    <div className={`context-help ${open ? "is-open" : ""}`}>
      <button type="button" aria-label={`Ayuda: ${configured?.title ?? question.id}`} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <CircleHelp size={18} />
      </button>
      <div className="context-help-content" role="tooltip">
        <strong>{configured?.title ?? "Ayuda"}</strong>
        <span>{shortText}</span>
        {longText && <small>{longText}</small>}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  transform = "uppercase",
  type = "text",
  format = "text",
  maxLength,
  onBlur,
  onEnter,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  transform?: "uppercase" | "none";
  type?: React.HTMLInputTypeAttribute;
  format?: "text" | "phone" | "rfcMoral";
  maxLength?: number;
  onBlur?: () => void;
  onEnter?: () => void;
}) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let nextValue = event.target.value;
    if (format === "phone") nextValue = normalizePhone(nextValue);
    if (format === "rfcMoral") nextValue = normalizeRfcMoral(nextValue);
    if (format === "text" && transform === "uppercase") nextValue = nextValue.toLocaleUpperCase("es-MX");
    if (maxLength) nextValue = nextValue.slice(0, maxLength);
    onChange(nextValue);
  };

  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        inputMode={format === "phone" ? "numeric" : undefined}
        maxLength={maxLength}
        onBlur={onBlur}
        onChange={handleChange}
        onKeyDown={(event) => {
          if (event.key === "Enter") onEnter?.();
        }}
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="field"><span>{label}</span><textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value.toLocaleUpperCase("es-MX"))} /></label>;
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="password-control">
        <input type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} />
        <button type="button" onClick={() => setVisible((current) => !current)}>{visible ? "Ocultar" : "Ver"}</button>
      </div>
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function InsightList({ title, items }: { title: string; items: string[] }) {
  return <div className="card"><h3>{title}</h3><ul className="insights">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

function TwoColumns({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return <div className="two-columns"><div>{left}</div><div>{right}</div></div>;
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  return <div className="progress-ring"><strong>{value}%</strong><span>{label}</span></div>;
}

function ChartBlock({ title, data }: { title: string; data: { title: string; value: number }[] }) {
  return <div className="card"><h3>{title}</h3>{data.map((item) => <div className="chart-row" key={item.title}><span>{item.title}</span><div><i style={{ width: `${Math.min(item.value, 100)}%` }} /></div><strong>{item.value}%</strong></div>)}</div>;
}

function LevelDistribution({ diagnostics: adminDiagnostics }: { diagnostics: AdminDiagnosticRecord[] }) {
  const data = platformContentConfig.trafficLight.map((level) => ({
    title: level.label,
    value: Math.round(
      adminDiagnostics.filter((diagnostic) => diagnostic.result.percentage >= level.min && diagnostic.result.percentage <= level.max).length
      / Math.max(adminDiagnostics.length, 1)
      * 100,
    ),
  }));
  return <ChartBlock title="Empresas por nivel de madurez" data={data} />;
}

function PrepPanel({ onStart, hasResult }: { onStart: () => void; hasResult: boolean }) {
  const previewQuestions = diagnosticModules[0].questions.slice().sort((a, b) => a.order - b.order).slice(0, 2);
  return (
    <div className="diagnostic-preview">
      <div className="card prepared">
        <ClipboardList size={34} />
        <h2>Autodiagnóstico por secciones</h2>
        <p>El cuestionario evalúa constitución, gobierno, libros, representación legal, contratos, cumplimiento y continuidad y legado empresarial.</p>
        <div className="progress"><span style={{ width: "14%" }} /></div>
        <div className="module-status"><strong>Sección 1 de {diagnosticModules.length}</strong><span>{diagnosticModules[0].title}</span></div>
      </div>
      <div className="question-list preview-questions">
        {previewQuestions.map((question) => (
          <article className="question-card" key={question.id}>
            <span className="question-id">{question.id}</span>
            <h3>{question.text}</h3>
            <div className="segmented">
              {[...question.options].sort((left, right) => answerDisplayOrder(left.label) - answerDisplayOrder(right.label)).map((option) => (
                <button type="button" key={option.label}>{option.label}</button>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="actions-row">
        <button className="primary" onClick={onStart}>{hasResult ? "Actualizar autodiagnóstico" : "Iniciar autodiagnóstico"}</button>
      </div>
    </div>
  );
}

function ObservationList({ companyId, companyName, authorRole, authorName }: { companyId: string; companyName: string; authorRole: "admin" | "company"; authorName: string }) {
  const [savedObservations, setSavedObservations] = useState<ObservationRecord[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const localObservations = observations
    .filter((observation) => observation.companyId === companyId)
    .map((observation) => ({
      id: observation.id,
      companyId: observation.companyId,
      companyName,
      author: observation.author,
      authorRole: "admin" as const,
      text: observation.text,
      createdAt: observation.date,
    }));

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getObservationsByCompany(companyId)
      .then((items) => {
        if (!mounted) return;
        setSavedObservations([...items].sort((left, right) => observationTime(right.createdAt) - observationTime(left.createdAt)));
        setError("");
      })
      .catch((reason) => {
        if (mounted) setError(getFriendlyErrorMessage(reason, "No fue posible consultar observaciones guardadas."));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [companyId]);

  const list = savedObservations.length ? savedObservations : localObservations;
  const submit = async () => {
    const cleanText = text.trim();
    setMessage("");
    setError("");
    if (!cleanText) {
      setError("Escribe una observación antes de enviarla.");
      return;
    }

    setSaving(true);
    try {
      const id = await createObservation({ companyId, companyName, author: authorName, authorRole, text: cleanText });
      setSavedObservations((current) => [{
        id,
        companyId,
        companyName,
        author: authorName,
        authorRole,
        text: cleanText,
        createdAt: new Date().toISOString(),
      }, ...current]);
      setText("");
      setMessage(authorRole === "admin" ? "Observación enviada a la empresa." : "Observación enviada a COPARMEX.");
    } catch (reason) {
      setError(getFriendlyErrorMessage(reason, "No fue posible guardar la observación."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h3>{authorRole === "admin" ? "Observaciones de la empresa" : "Observaciones"}</h3>
      {loading && <p className="muted">Consultando observaciones...</p>}
      {error && <p className="form-error">{error}</p>}
      {message && <p className="save-status success">{message}</p>}
      {list.length ? list.map((observation) => (
        <p className="note" key={observation.id}>
          <strong>{observation.author}</strong>
          <span>{observation.authorRole === "company" ? "Empresa" : "COPARMEX"} - {formatSavedDate(observation.createdAt)}</span>
          {observation.text}
        </p>
      )) : <p className="muted">Aún no hay observaciones registradas.</p>}
      <TextArea
        label={authorRole === "admin" ? "Nueva observación para la empresa" : "Nueva observación para COPARMEX"}
        value={text}
        placeholder="Escribe el comentario o seguimiento."
        onChange={setText}
      />
      <button className="primary" onClick={submit} disabled={saving}>{saving ? "Guardando..." : "Enviar observación"}</button>
    </div>
  );
}

function AllObservations() {
  const [savedObservations, setSavedObservations] = useState<ObservationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [observationSearch, setObservationSearch] = useState("");
  const [observationCompany, setObservationCompany] = useState("");
  const [observationAuthor, setObservationAuthor] = useState("");

  useEffect(() => {
    let mounted = true;
    listObservations()
      .then((items) => {
        if (mounted) setSavedObservations(items);
      })
      .catch((reason) => {
        if (mounted) setError(getFriendlyErrorMessage(reason, "No fue posible consultar observaciones guardadas."));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const localObservations = observations.map((observation) => ({
    id: observation.id,
    companyId: observation.companyId,
    companyName: companies.find((company) => company.id === observation.companyId)?.name || "Empresa",
    author: observation.author,
    authorRole: "admin" as const,
    text: observation.text,
    createdAt: observation.date,
  }));
  const list = savedObservations.length ? savedObservations : localObservations;
  const visibleObservations = list.filter((observation) => {
    const search = observationSearch.trim().toLocaleLowerCase("es-MX");
    return (!search || `${observation.companyName} ${observation.author} ${observation.text}`.toLocaleLowerCase("es-MX").includes(search)) &&
      (!observationCompany || observation.companyName === observationCompany) &&
      (!observationAuthor || observation.author === observationAuthor);
  });
  const observationCompanies = [...new Set(list.map((item) => item.companyName))].sort((a, b) => a.localeCompare(b, "es-MX"));
  const observationAuthors = [...new Set(list.map((item) => item.author))].sort((a, b) => a.localeCompare(b, "es-MX"));

  return (
    <div className="card">
      <h3>Observaciones institucionales</h3>
      {loading && <p className="muted">Consultando observaciones...</p>}
      {error && <p className="form-error">{error}</p>}
      <div className="admin-filter-bar observation-filters">
        <label className="field"><span>Buscar</span><input value={observationSearch} onChange={(event) => setObservationSearch(event.target.value)} placeholder="Empresa, autor o texto" /></label>
        <Select label="Empresa" value={observationCompany} onChange={setObservationCompany} options={["", ...observationCompanies]} />
        <Select label="Autor" value={observationAuthor} onChange={setObservationAuthor} options={["", ...observationAuthors]} />
      </div>
      {visibleObservations.length ? visibleObservations.map((observation) => (
        <p className="note" key={observation.id}>
          <strong>{observation.companyName}</strong>
          <span>{observation.author} - {observation.authorRole === "company" ? "Empresa" : "COPARMEX"} - {formatSavedDate(observation.createdAt)}</span>
          {observation.text}
        </p>
      )) : <p className="muted">Aún no hay observaciones registradas.</p>}
    </div>
  );
}

function ProfileCard({ company, result, hideFollowUp = false }: { company: CompanyProfile; result: DiagnosticResult | null; hideFollowUp?: boolean }) {
  const maturity = result ? getComplianceLevel(result.percentage) : null;
  return (
    <div className="card profile profile-executive">
      <div className="profile-heading">
        <div>
          <span className="eyebrow">Empresa afiliada</span>
          <h3>Perfil empresa</h3>
        </div>
        <div className="profile-badges">
          <span className={`maturity-chip ${maturity?.color ?? ""}`}>{maturity?.label ?? "Sin autodiagnóstico"}</span>
        </div>
      </div>
      <div className="profile-block-grid">
        <section className="profile-block">
          <h4>Información general</h4>
          <ProfileField label="Nombre" value={company.name} />
          <ProfileField label="Folio" value={getCompanyFolio(company)} />
          <ProfileField label="Sector" value={company.sector} />
          <ProfileField label="Registro" value={formatDate(company.registeredAt)} />
        </section>
        <section className="profile-block">
          <h4>Contacto</h4>
          <ProfileField label="Representante" value={company.representative} />
          <ProfileField label="Correo" value={company.email} />
          <ProfileField label="Teléfono" value={company.phone} />
        </section>
        <section className="profile-block">
          <h4>Ubicación y madurez</h4>
          <ProfileField label="Ciudad" value={company.city} />
          <ProfileField label="Estado" value={company.state} />
          <ProfileField label="Madurez" value={maturity?.label ?? "Sin autodiagnóstico"} />
        </section>
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value?: React.ReactNode }) {
  return <p><span>{label}</span><strong>{value || "No capturado"}</strong></p>;
}

function DocumentsPanel({ companyId }: { companyId: string }) {
  return <div className="card"><h3>Expediente documental</h3><div className="document-grid">{documents.filter((document) => document.companyId === companyId).map((document) => <div className="document" key={document.id}><FileText size={20} /><strong>{document.name}</strong><Badge tone={document.status === "Validado" ? "verde" : document.status === "Observado" ? "naranja" : "amarillo"}>{document.status}</Badge><small>{document.observation ?? "Historial documental disponible para validación administrativa."}</small></div>)}</div></div>;
}

function ActivityPanel({ companyId }: { companyId: string }) {
  return <div className="card"><h3>Bitácora de actividades</h3>{activityLog.filter((log) => log.companyId === companyId).map((log) => <p className="note" key={log.id}><strong>{log.event}</strong><span>{log.date} - {log.actor}</span></p>)}</div>;
}

function DiagnosticsPanel({ diagnostics: adminDiagnostics, loading, error }: { diagnostics: AdminDiagnosticRecord[]; loading: boolean; error: string }) {
  return (
    <div className="card">
      <h3>Autodiagnósticos</h3>
      {loading && <p className="muted">Consultando autodiagnósticos...</p>}
      {error && <p className="form-error">{error}</p>}
      {adminDiagnostics.length ? adminDiagnostics.map((diagnostic) => (
        <p className="note" key={diagnostic.id}>
          <strong>{diagnostic.id} - {diagnostic.companyName}</strong>
          <span>{diagnostic.result.percentage}% - {getComplianceLevel(diagnostic.result.percentage).label} - {formatDate(diagnostic.completedAt)}</span>
          {diagnostic.source === "saved" ? "Resultado guardado por la empresa." : "Resultado institucional de referencia."}
        </p>
      )) : <p className="muted">Aún no hay autodiagnósticos registrados.</p>}
    </div>
  );
}

type AdministrativeReportRow = {
  company: AdminCompany;
  folio: string;
  employees: number | null;
  size: string;
  hasDiagnostic: boolean;
  level: string;
  percentage: number | null;
  semaphore: string;
  observations: number;
  attentionReason: string;
};

function ReportsPanelV3({ intent, diagnostics: adminDiagnostics }: { intent: AdminIntent; diagnostics: AdminDiagnosticRecord[] }) {
  const [reportType, setReportType] = useState<"companies" | "aggregate" | "priority">(() => intent === "priority-report" ? "priority" : "companies");
  const [systemCompanies, setSystemCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [diagnosticFilter, setDiagnosticFilter] = useState("Todos");
  const [levelFilter, setLevelFilter] = useState("Todos");
  const [sectorFilter, setSectorFilter] = useState("Todos");
  const [sizeFilter, setSizeFilter] = useState("Todos");
  const [observationFilter, setObservationFilter] = useState("Todas");
  const [sortBy, setSortBy] = useState("Empresa");

  useEffect(() => {
    if (intent === "priority-report") setReportType("priority");
    if (intent === "companies-report") setReportType("companies");
  }, [intent]);

  useEffect(() => {
    let mounted = true;
    listCompanies()
      .then((items) => {
        if (mounted) setSystemCompanies(items.map((item) => mapCompanyRecord(item)));
      })
      .catch((requestError) => {
        console.error("No fue posible consultar el padrón para reportes.", requestError);
        if (mounted) setError("No fue posible consultar el padrón registrado. Se muestran datos institucionales de referencia.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const reportCompanies: AdminCompany[] = systemCompanies.length ? systemCompanies : companies.map((company) => ({ ...company, source: "mock" as const }));
  const rows: AdministrativeReportRow[] = reportCompanies.map((company) => {
    const diagnostic = adminDiagnostics.find((item) => item.companyId === company.id);
    const percentage = diagnostic?.result.percentage ?? null;
    const compliance = percentage === null ? null : getComplianceLevel(percentage);
    const observationCount = observations.filter((item) => item.companyId === company.id).length;
    const reasons = [
      !diagnostic ? "Sin autodiagnóstico" : "",
      compliance?.key === "critical" ? "Riesgo crítico" : "",
      compliance?.key === "immediate" ? "Atención inmediata" : "",
      percentage !== null && percentage < 70 ? "Cumplimiento menor a 70%" : "",
      observationCount > 0 ? "Con observaciones" : "",
    ].filter(Boolean);
    return {
      company,
      folio: getCompanyFolio(company),
      employees: getCompanyEmployeeCount(company),
      size: getCompanySize(company),
      hasDiagnostic: Boolean(diagnostic && percentage !== null),
      level: compliance?.label ?? "Pendiente",
      percentage,
      semaphore: compliance?.label ?? "Pendiente",
      observations: observationCount,
      attentionReason: reasons.join(" · ") || "Sin motivo prioritario",
    };
  });
  const priorityRows = rows.filter((row) => !row.hasDiagnostic || row.percentage === null || row.percentage < 70 || row.observations > 0);
  const baseRows = reportType === "priority" ? priorityRows : rows;
  const visibleRows = baseRows
    .filter((row) => {
      const query = search.trim().toLocaleLowerCase("es-MX");
      const searchable = `${row.company.name} ${row.folio} ${row.company.representative} ${row.company.email}`.toLocaleLowerCase("es-MX");
      return (!query || searchable.includes(query)) &&
        (diagnosticFilter === "Todos" || (row.hasDiagnostic ? "Con autodiagnóstico" : "Sin autodiagnóstico") === diagnosticFilter) &&
        (levelFilter === "Todos" || row.level === levelFilter) &&
        (sectorFilter === "Todos" || row.company.sector === sectorFilter) &&
        (sizeFilter === "Todos" || row.size === sizeFilter || (sizeFilter === "Sin dato" && row.size === "No calculado")) &&
        (observationFilter === "Todas" || (row.observations > 0 ? "Con observaciones" : "Sin observaciones") === observationFilter);
    })
    .sort((left, right) => {
      const values: Record<string, [string | number, string | number]> = {
        Folio: [left.folio, right.folio],
        Empresa: [left.company.name, right.company.name],
        Sector: [left.company.sector, right.company.sector],
        "Número de empleados": [left.employees ?? -1, right.employees ?? -1],
        "Tamaño empresa": [left.size, right.size],
        Autodiagnóstico: [left.hasDiagnostic ? 1 : 0, right.hasDiagnostic ? 1 : 0],
        Nivel: [left.level, right.level],
        Porcentaje: [left.percentage ?? -1, right.percentage ?? -1],
        Observaciones: [left.observations, right.observations],
      };
      const [a, b] = values[sortBy] ?? values.Empresa;
      return typeof a === "number" && typeof b === "number" ? b - a : String(a).localeCompare(String(b), "es-MX");
    });
  const diagnosedRows = rows.filter((row) => row.hasDiagnostic);
  const average = Math.round(diagnosedRows.reduce((sum, row) => sum + (row.percentage ?? 0), 0) / Math.max(diagnosedRows.length, 1));
  const sectors = [...new Set(rows.map((row) => row.company.sector || "Sin dato"))].sort((a, b) => a.localeCompare(b, "es-MX"));
  const moduleAverages = diagnosticModules.map((module) => ({
    title: module.title,
    value: Math.round(adminDiagnostics.reduce((sum, diagnostic) => sum + (diagnostic.result.moduleScores.find((score) => score.moduleId === module.id)?.percentage ?? 0), 0) / Math.max(adminDiagnostics.length, 1)),
  }));
  const exportRows = visibleRows.map((row) => reportType === "priority" ? ({
    Folio: row.folio,
    Empresa: row.company.name,
    Representante: row.company.representative || "Sin dato",
    Correo: row.company.email || "Sin dato",
    Sector: row.company.sector || "Sin dato",
    "Número de empleados": row.employees ?? "Sin dato",
    "Tamaño empresa": row.size === "No calculado" ? "Sin dato" : row.size,
    Autodiagnóstico: row.hasDiagnostic ? "Sí" : "No",
    Nivel: row.level,
    Porcentaje: row.percentage === null ? "Sin dato" : `${row.percentage}%`,
    "Motivo de atención": row.attentionReason,
    Observaciones: row.observations,
  }) : ({
    Folio: row.folio,
    Empresa: row.company.name,
    Representante: row.company.representative || "Sin dato",
    Correo: row.company.email || "Sin dato",
    Sector: row.company.sector || "Sin dato",
    "Número de empleados": row.employees ?? "Sin dato",
    "Tamaño empresa": row.size === "No calculado" ? "Sin dato" : row.size,
    Autodiagnóstico: row.hasDiagnostic ? "Sí" : "No",
    Nivel: row.level,
    Porcentaje: row.percentage === null ? "Sin dato" : `${row.percentage}%`,
    "Semáforo de cumplimiento": row.semaphore,
    Observaciones: row.observations,
  }));
  const aggregateExportRows = [
    { Indicador: "Empresas registradas", Valor: rows.length },
    { Indicador: "Empresas con autodiagnóstico real", Valor: diagnosedRows.length },
    { Indicador: "Empresas sin autodiagnóstico", Valor: rows.length - diagnosedRows.length },
    { Indicador: "Promedio general ICE", Valor: `${average}%` },
    { Indicador: "Empresas prioritarias", Valor: priorityRows.length },
  ];

  return (
    <section className="reports-functional">
      <SectionTitle title="Reportes institucionales" subtitle="Consulta, filtra y exporta información administrativa del padrón empresarial." />
      {loading && <div className="save-status">Consultando padrón empresarial...</div>}
      {error && <div className="save-status error">{error}</div>}
      <div className="report-selector">
        <button className={reportType === "companies" ? "active" : ""} onClick={() => setReportType("companies")}><Building2 size={19} /><strong>Reporte de empresas</strong><span>{rows.length} empresas registradas.</span></button>
        <button className={reportType === "aggregate" ? "active" : ""} onClick={() => setReportType("aggregate")}><BarChart3 size={19} /><strong>Reporte agregado ICE</strong><span>{diagnosedRows.length} resultados consolidados.</span></button>
        <button className={reportType === "priority" ? "active" : ""} onClick={() => setReportType("priority")}><ShieldCheck size={19} /><strong>Atención prioritaria</strong><span>{priorityRows.length} empresas requieren atención.</span></button>
      </div>
      {reportType === "aggregate" ? (
        <>
          <div className="card report-intro-card">
            <div>
              <h3>Reporte agregado ICE</h3>
              <p className="muted">Indicadores calculados únicamente con autodiagnósticos reales guardados.</p>
            </div>
            <div className="report-export-actions">
              <button className="secondary" onClick={() => exportCsv("reporte-agregado-ice.csv", aggregateExportRows)}><Download size={17} /> Descargar CSV</button>
              <button className="primary" onClick={() => exportExcel("reporte-agregado-ice.xlsx", "Reporte agregado ICE", aggregateExportRows)}><FileSpreadsheet size={17} /> Descargar Excel</button>
            </div>
          </div>
          <div className="kpi-grid report-kpis">
            <Kpi icon={<Building2 />} label="Empresas registradas" value={rows.length} />
            <Kpi icon={<CheckCircle2 />} label="Con autodiagnóstico" value={diagnosedRows.length} />
            <Kpi icon={<ClipboardList />} label="Sin autodiagnóstico" value={rows.length - diagnosedRows.length} />
            <Kpi icon={<BarChart3 />} label="Promedio general ICE" value={`${average}%`} />
          </div>
          <div className="dashboard-grid">
            <LevelDistribution diagnostics={adminDiagnostics} />
            <ChartBlock title="Promedio por sección" data={moduleAverages} />
          </div>
        </>
      ) : (
        <div className="card report-table-card">
          <div className="report-priority-heading">
            <div>
              <h3>{reportType === "priority" ? "Reporte de atención prioritaria" : "Reporte de empresas"}</h3>
              <p className="muted">{reportType === "priority" ? "Empresas sin autodiagnóstico, con cumplimiento menor a 70% o con observaciones." : "Padrón empresarial con estado de autodiagnóstico y resultados ICE."}</p>
            </div>
            <div className="report-export-actions">
              <button className="secondary" onClick={() => exportCsv(reportType === "priority" ? "atencion-prioritaria.csv" : "reporte-empresas.csv", exportRows)}><Download size={17} /> Descargar CSV</button>
              <button className="primary" onClick={() => exportExcel(reportType === "priority" ? "atencion-prioritaria.xlsx" : "reporte-empresas.xlsx", reportType === "priority" ? "Atención prioritaria" : "Reporte de empresas", exportRows)}><FileSpreadsheet size={17} /> Descargar Excel</button>
            </div>
          </div>
          <div className="card admin-filter-bar report-filter-bar">
            <label className="field"><span>Buscar</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Empresa, folio, correo o representante" /></label>
            <Select label="Autodiagnóstico" value={diagnosticFilter} onChange={setDiagnosticFilter} options={["Todos", "Con autodiagnóstico", "Sin autodiagnóstico"]} />
            <Select label="Nivel" value={levelFilter} onChange={setLevelFilter} options={["Todos", "Madura", "Área de oportunidad", "Atención inmediata", "Riesgo crítico", "Pendiente"]} />
            <Select label="Sector" value={sectorFilter} onChange={setSectorFilter} options={["Todos", ...sectors]} />
            <Select label="Tamaño" value={sizeFilter} onChange={setSizeFilter} options={["Todos", "Micro", "Pequeña", "Mediana", "Grande", "Sin dato"]} />
            <Select label="Observaciones" value={observationFilter} onChange={setObservationFilter} options={["Todas", "Con observaciones", "Sin observaciones"]} />
            <Select label="Ordenar por" value={sortBy} onChange={setSortBy} options={["Empresa", "Folio", "Sector", "Número de empleados", "Tamaño empresa", "Autodiagnóstico", "Nivel", "Porcentaje", "Observaciones"]} />
          </div>
          <p className="admin-list-count">{visibleRows.length} empresas visibles de {baseRows.length}</p>
          <AdministrativeReportTable rows={visibleRows} priority={reportType === "priority"} />
        </div>
      )}
    </section>
  );
}

function AdministrativeReportTable({ rows, priority }: { rows: AdministrativeReportRow[]; priority: boolean }) {
  return (
    <div className="report-table-wrap">
      <table className={`report-table ${priority ? "priority" : ""}`}>
        <thead><tr><th>Folio</th><th>Empresa</th><th>Representante</th><th>Correo</th><th>Sector</th><th>Empleados</th><th>Tamaño</th><th>Autodiagnóstico</th><th>Nivel</th><th>%</th>{priority ? <th>Motivo de atención</th> : <th>Semáforo</th>}<th>Observaciones</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.company.id}>
          <td>{row.folio || "Sin dato"}</td><td>{row.company.name || "Sin dato"}</td><td>{row.company.representative || "Sin dato"}</td><td>{row.company.email || "Sin dato"}</td><td>{row.company.sector || "Sin dato"}</td><td>{row.employees ?? "Sin dato"}</td>
          <td><span className="report-size">{row.size === "No calculado" ? "Sin dato" : row.size}</span></td>
          <td><span className={`report-status ${row.hasDiagnostic ? "yes" : "no"}`}>{row.hasDiagnostic ? "Sí" : "No"}</span></td>
          <td><span className={`report-level ${getReportLevelTone(row.level)}`}>{row.level}</span></td><td>{row.percentage === null ? "Sin dato" : `${row.percentage}%`}</td>
          <td>{priority ? row.attentionReason : <span className={`report-level ${getReportLevelTone(row.semaphore)}`}>{row.semaphore}</span>}</td><td>{row.observations}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}

function ReportsPanelV2({ diagnostics: adminDiagnostics }: { stats: any; diagnostics: AdminDiagnosticRecord[] }) {
  const [reportType, setReportType] = useState<"companies" | "aggregate" | "priority">("companies");
  const [reportSearch, setReportSearch] = useState("");
  const [systemCompanies, setSystemCompanies] = useState<AdminCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState("");

  useEffect(() => {
    let mounted = true;
    listCompanies()
      .then((items) => {
        if (!mounted) return;
        setSystemCompanies(items.map((item) => mapCompanyRecord(item)));
        setCompaniesError("");
      })
      .catch((error) => {
        console.error("No fue posible consultar el padrón para reportes.", error);
        if (mounted) setCompaniesError("No fue posible consultar el padrón registrado. Se muestran datos institucionales de referencia.");
      })
      .finally(() => {
        if (mounted) setCompaniesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const reportCompanies: AdminCompany[] = systemCompanies.length
    ? systemCompanies
    : companies.map((company) => ({ ...company, source: "mock" as const }));
  const rows = reportCompanies.map((company) => {
    const diagnostic = adminDiagnostics.find((item) => item.companyId === company.id);
    const level = diagnostic ? getComplianceLevel(diagnostic.result.percentage) : null;
    return {
      company,
      diagnostic,
      folio: getCompanyFolio(company),
      employees: getCompanyEmployeeCount(company),
      size: getCompanySize(company),
      level: level?.label ?? "Pendiente",
      percentage: diagnostic?.result.percentage ?? null,
      observations: observations.filter((item) => item.companyId === company.id).length,
    };
  });
  const diagnosedRows = rows.filter((row) => row.diagnostic);
  const priorityRows = rows.filter((row) => {
    const levelKey = row.diagnostic ? getComplianceLevel(row.percentage ?? 0).key : "pending";
    return levelKey === "critical" || levelKey === "immediate" || !row.diagnostic || row.observations > 0 || row.company.followUpStatus === "Sin iniciar";
  });
  const visiblePriorityRows = priorityRows.filter((row) => {
    const search = reportSearch.trim().toLocaleLowerCase("es-MX");
    return !search || `${row.company.name} ${row.folio} ${row.company.representative} ${row.company.email}`.toLocaleLowerCase("es-MX").includes(search);
  });
  const average = Math.round(diagnosedRows.reduce((sum, row) => sum + (row.percentage ?? 0), 0) / Math.max(diagnosedRows.length, 1));
  const criticalCount = diagnosedRows.filter((row) => getComplianceLevel(row.percentage ?? 0).key === "critical").length;
  const immediateCount = diagnosedRows.filter((row) => getComplianceLevel(row.percentage ?? 0).key === "immediate").length;
  const companySizeData = ["Micro", "Pequeña", "Mediana", "Grande", "No calculado"].map((size) => ({
    title: size,
    value: Math.round((rows.filter((row) => row.size === size).length / Math.max(rows.length, 1)) * 100),
  }));
  const sectorData = [...new Set(rows.map((row) => row.company.sector || "No especificado"))]
    .map((sector) => ({
      title: sector,
      value: Math.round((rows.filter((row) => (row.company.sector || "No especificado") === sector).length / Math.max(rows.length, 1)) * 100),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const moduleAverages = diagnosticModules.map((module) => ({
    title: module.title,
    value: Math.round(adminDiagnostics.reduce((sum, diagnostic) => sum + (diagnostic.result.moduleScores.find((score) => score.moduleId === module.id)?.percentage ?? 0), 0) / Math.max(adminDiagnostics.length, 1)),
  }));
  const sectorAverages = [...new Set(adminDiagnostics.map((diagnostic) => diagnostic.companySector))]
    .map((sector) => {
      const sectorDiagnostics = adminDiagnostics.filter((diagnostic) => diagnostic.companySector === sector);
      return {
        title: sector,
        value: Math.round(sectorDiagnostics.reduce((sum, diagnostic) => sum + diagnostic.result.percentage, 0) / Math.max(sectorDiagnostics.length, 1)),
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const companyExportRows = rows.map((row) => ({
    Folio: row.folio,
    Empresa: row.company.name,
    Representante: row.company.representative,
    Correo: row.company.email,
    Sector: row.company.sector,
    Empleados: row.employees ?? "",
    "Tamaño estimado": row.size,
    Nivel: row.level,
    Porcentaje: row.percentage ?? "",
    Observaciones: row.observations,
    Seguimiento: row.company.followUpStatus,
  }));
  const priorityExportRows = visiblePriorityRows.map((row) => ({
    Folio: row.folio,
    Empresa: row.company.name,
    Representante: row.company.representative,
    Correo: row.company.email,
    Sector: row.company.sector,
    Nivel: row.level,
    Porcentaje: row.percentage ?? "",
    Observaciones: row.observations,
    Seguimiento: row.company.followUpStatus,
  }));
  const aggregateExportRows = [
    { Indicador: "Empresas registradas", Valor: rows.length },
    { Indicador: "Empresas con autodiagnóstico", Valor: diagnosedRows.length },
    { Indicador: "Empresas pendientes", Valor: Math.max(rows.length - diagnosedRows.length, 0) },
    { Indicador: "Promedio general ICE", Valor: `${average}%` },
    { Indicador: "Empresas en riesgo crítico", Valor: criticalCount },
    { Indicador: "Empresas en atención inmediata", Valor: immediateCount },
  ];

  return (
    <section className="reports-functional">
      <SectionTitle title="Reportes institucionales" subtitle="Genera información útil para padrón, indicadores ICE y seguimiento prioritario." />
      {companiesLoading && <div className="save-status">Consultando padrón empresarial...</div>}
      {companiesError && <div className="save-status error">{companiesError}</div>}
      <div className="report-selector">
        <button className={reportType === "companies" ? "active" : ""} onClick={() => setReportType("companies")}><Building2 size={19} /><strong>Padrón empresarial</strong><span>{rows.length} empresas registradas y disponibles para exportación.</span></button>
        <button className={reportType === "aggregate" ? "active" : ""} onClick={() => setReportType("aggregate")}><BarChart3 size={19} /><strong>Resumen agregado ICE</strong><span>{diagnosedRows.length} empresas con resultados consolidados.</span></button>
        <button className={reportType === "priority" ? "active" : ""} onClick={() => setReportType("priority")}><ShieldCheck size={19} /><strong>Seguimiento prioritario</strong><span>{priorityRows.length} empresas requieren revisión o seguimiento.</span></button>
      </div>

      {reportType === "companies" && (
        <>
          <div className="card report-intro-card">
            <div>
              <h3>Padrón empresarial</h3>
              <p className="muted">Resumen del padrón registrado. La exportación incluye contacto, sector, tamaño, nivel ICE y seguimiento.</p>
            </div>
            <button className="primary" onClick={() => exportCsv("padron-empresarial.csv", companyExportRows)}><Download size={17} /> Exportar padrón CSV</button>
          </div>
          <div className="kpi-grid report-kpis">
            <Kpi icon={<Building2 />} label="Empresas registradas" value={rows.length} />
            <Kpi icon={<CheckCircle2 />} label="Con autodiagnóstico" value={diagnosedRows.length} />
            <Kpi icon={<ClipboardList />} label="Sin autodiagnóstico" value={Math.max(rows.length - diagnosedRows.length, 0)} />
            <Kpi icon={<UserRoundCheck />} label="Con seguimiento activo" value={rows.filter((row) => row.company.followUpStatus === "En seguimiento").length} />
          </div>
          <div className="dashboard-grid report-summary-grid">
            <ChartBlock title="Distribución por tamaño" data={companySizeData} />
            <ChartBlock title="Principales sectores" data={sectorData} />
          </div>
        </>
      )}

      {reportType === "aggregate" && (
        <>
          <div className="card report-intro-card">
            <div>
              <h3>Resumen agregado ICE</h3>
              <p className="muted">Indicadores consolidados de las empresas que ya completaron su autodiagnóstico.</p>
            </div>
            <button className="primary" onClick={() => exportCsv("resumen-agregado-ice.csv", aggregateExportRows)}><Download size={17} /> Exportar resumen CSV</button>
          </div>
          <div className="kpi-grid report-kpis">
            <Kpi icon={<CheckCircle2 />} label="Con autodiagnóstico" value={diagnosedRows.length} />
            <Kpi icon={<BarChart3 />} label="Promedio general ICE" value={`${average}%`} />
            <Kpi icon={<ShieldCheck />} label="Riesgo crítico" value={criticalCount} />
            <Kpi icon={<UserRoundCheck />} label="Atención inmediata" value={immediateCount} />
          </div>
          <div className="dashboard-grid">
            <LevelDistribution diagnostics={adminDiagnostics} />
            <ChartBlock title="Promedio por sección" data={moduleAverages} />
            <ChartBlock title="Promedio por sector" data={sectorAverages} />
          </div>
        </>
      )}

      {reportType === "priority" && (
        <div className="card report-table-card">
          <div className="report-priority-heading">
            <div>
              <h3>Seguimiento prioritario</h3>
              <p className="muted">Empresas sin autodiagnóstico, con resultados críticos, observaciones o seguimiento pendiente.</p>
            </div>
            <div className="report-priority-count"><strong>{priorityRows.length}</strong><span>empresas identificadas</span></div>
          </div>
          <div className="report-toolbar">
            <label className="field"><span>Buscar</span><input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Empresa, folio, representante o correo" /></label>
            <button className="secondary" onClick={() => exportCsv("seguimiento-prioritario.csv", priorityExportRows)}><Download size={17} /> Exportar seguimiento CSV</button>
          </div>
          <p className="admin-list-count">{visiblePriorityRows.length} empresas visibles de {priorityRows.length}</p>
          <ReportCompaniesTable rows={visiblePriorityRows} />
        </div>
      )}
    </section>
  );
}

function ReportsPanel({ stats, diagnostics: adminDiagnostics }: { stats: any; diagnostics: AdminDiagnosticRecord[] }) {
  const [reportType, setReportType] = useState<"companies" | "aggregate" | "priority">("companies");
  const [reportSearch, setReportSearch] = useState("");
  const rows = companies.map((company) => {
    const diagnostic = adminDiagnostics.find((item) => item.companyId === company.id);
    const level = diagnostic ? getComplianceLevel(diagnostic.result.percentage) : null;
    return {
      company,
      diagnostic,
      folio: getCompanyFolio(company),
      employees: getCompanyEmployeeCount(company),
      size: getCompanySize(company),
      level: level?.label ?? "Pendiente",
      percentage: diagnostic?.result.percentage ?? null,
      observations: observations.filter((item) => item.companyId === company.id).length,
    };
  });
  const visibleRows = rows.filter((row) => {
    const search = reportSearch.trim().toLocaleLowerCase("es-MX");
    const matchesSearch = !search || `${row.company.name} ${row.folio} ${row.company.representative} ${row.company.email}`.toLocaleLowerCase("es-MX").includes(search);
    const priority = row.level === "Riesgo crítico" || row.level === "Atención inmediata" || row.level === "Pendiente" || row.observations > 0 || row.company.followUpStatus === "Sin iniciar";
    return matchesSearch && (reportType !== "priority" || priority);
  });

  const exportRows = visibleRows.map((row) => ({
    Folio: row.folio,
    Empresa: row.company.name,
    Representante: row.company.representative,
    Correo: row.company.email,
    Sector: row.company.sector,
    Empleados: row.employees ?? "",
    "Tamaño estimado": row.size,
    Nivel: row.level,
    Porcentaje: row.percentage ?? "",
    Semáforo: row.level,
    Observaciones: row.observations,
    Seguimiento: row.company.followUpStatus,
  }));

  return (
    <section className="reports-functional">
      <SectionTitle title="Reportes institucionales" subtitle="Consulta información operativa, indicadores agregados y empresas que requieren seguimiento." />
      <div className="report-selector">
        <button className={reportType === "companies" ? "active" : ""} onClick={() => setReportType("companies")}><Building2 size={19} /><strong>Reporte de empresas</strong><span>Listado operativo completo.</span></button>
        <button className={reportType === "aggregate" ? "active" : ""} onClick={() => setReportType("aggregate")}><BarChart3 size={19} /><strong>Reporte agregado ICE</strong><span>Indicadores y distribución general.</span></button>
        <button className={reportType === "priority" ? "active" : ""} onClick={() => setReportType("priority")}><ShieldCheck size={19} /><strong>Atención prioritaria</strong><span>Empresas que requieren seguimiento.</span></button>
      </div>
      {reportType === "aggregate" ? (
        <>
          <div className="kpi-grid report-kpis">
            <Kpi icon={<Building2 />} label="Total de empresas" value={companies.length} />
            <Kpi icon={<CheckCircle2 />} label="Con autodiagnóstico" value={adminDiagnostics.length} />
            <Kpi icon={<ClipboardList />} label="Pendientes" value={Math.max(companies.length - adminDiagnostics.length, 0)} />
            <Kpi icon={<BarChart3 />} label="Promedio general" value={`${stats.average}%`} />
          </div>
          <div className="dashboard-grid">
            <LevelDistribution diagnostics={stats.diagnostics} />
            <ChartBlock title="Promedio por sección" data={stats.moduleAverages} />
            <ChartBlock title="Promedio por sector" data={stats.sectors.map((sector: any) => ({ title: sector.sector, value: sector.average || sector.count * 10 }))} />
          </div>
        </>
      ) : (
        <div className="card report-table-card">
          <div className="report-toolbar">
            <label className="field"><span>Buscar</span><input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Empresa, folio, representante o correo" /></label>
            <button className="secondary" onClick={() => exportCsv(reportType === "priority" ? "atencion-prioritaria.csv" : "reporte-empresas.csv", exportRows)}><Download size={17} /> Exportar CSV</button>
          </div>
          <ReportCompaniesTable rows={visibleRows} />
        </div>
      )}
    </section>
  );
}

function ReportCompaniesTable({ rows }: { rows: Array<{ company: CompanyProfile; folio: string; employees: number | null; size: string; level: string; percentage: number | null; observations: number }> }) {
  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead><tr><th>Folio</th><th>Empresa</th><th>Representante</th><th>Correo</th><th>Sector</th><th>Empleados</th><th>Tamaño</th><th>Nivel</th><th>%</th><th>Observaciones</th><th>Seguimiento</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.company.id}><td>{row.folio}</td><td>{row.company.name}</td><td>{row.company.representative}</td><td>{row.company.email}</td><td>{row.company.sector}</td><td>{row.employees ?? "-"}</td><td>{row.size}</td><td><span className={`report-level ${getReportLevelTone(row.level)}`}>{row.level}</span></td><td>{row.percentage ?? "-"}{row.percentage !== null ? "%" : ""}</td><td>{row.observations}</td><td>{row.company.followUpStatus}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function getReportLevelTone(level: string) {
  if (level === "Madura") return "green";
  if (level === "Área de oportunidad") return "yellow";
  if (level === "Atención inmediata") return "orange";
  if (level === "Riesgo crítico") return "red";
  return "";
}

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = `\uFEFF${headers.map(escape).join(",")}\n${rows.map((row) => headers.map((header) => escape(row[header])).join(",")).join("\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportExcel(filename: string, title: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const XLSX = await import("xlsx-js-style");
  const headers = Object.keys(rows[0]);
  const data = [
    [title],
    [`COPARMEX Nuevo Laredo · Índice de Competitividad Empresarial · ${new Date().toLocaleDateString("es-MX")}`],
    [],
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? "Sin dato")),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const lastColumn = XLSX.utils.encode_col(Math.max(headers.length - 1, 0));
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(headers.length - 1, 0) } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(headers.length - 1, 0) } },
  ];
  worksheet["!autofilter"] = { ref: `A4:${lastColumn}${rows.length + 4}` };
  worksheet["!cols"] = headers.map((header) => {
    const contentLength = Math.max(header.length, ...rows.map((row) => String(row[header] ?? "Sin dato").length));
    return { wch: Math.min(Math.max(contentLength + 3, 12), 42) };
  });
  worksheet["!rows"] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 8 }, { hpt: 22 }];
  worksheet["!freeze"] = { xSplit: 0, ySplit: 4, topLeftCell: "A5", activePane: "bottomLeft", state: "frozen" };
  const border = {
    top: { style: "thin", color: { rgb: "D7E1EC" } },
    bottom: { style: "thin", color: { rgb: "D7E1EC" } },
    left: { style: "thin", color: { rgb: "D7E1EC" } },
    right: { style: "thin", color: { rgb: "D7E1EC" } },
  };
  worksheet.A1.s = {
    font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
    fill: { patternType: "solid", fgColor: { rgb: "09284A" } },
    alignment: { vertical: "center", horizontal: "left" },
  };
  worksheet.A2.s = {
    font: { italic: true, sz: 10, color: { rgb: "5F748C" } },
    alignment: { vertical: "center", horizontal: "left" },
  };
  headers.forEach((_, columnIndex) => {
    const headerCell = worksheet[XLSX.utils.encode_cell({ r: 3, c: columnIndex })];
    if (headerCell) {
      headerCell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "0868B7" } },
        alignment: { vertical: "center", horizontal: "center", wrapText: true },
        border,
      };
    }
  });
  rows.forEach((_, rowIndex) => {
    headers.forEach((__, columnIndex) => {
      const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex + 4, c: columnIndex })];
      if (cell) {
        cell.s = {
          font: { color: { rgb: "102D4D" } },
          fill: { patternType: "solid", fgColor: { rgb: rowIndex % 2 === 0 ? "FFFFFF" : "EEF4FB" } },
          alignment: { vertical: "top", horizontal: "left", wrapText: true },
          border,
        };
      }
    });
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
  workbook.Props = {
    Title: title,
    Subject: "Índice de Competitividad Empresarial",
    Author: "COPARMEX Nuevo Laredo",
    Company: "COPARMEX Nuevo Laredo",
    CreatedDate: new Date(),
  };
  XLSX.writeFile(workbook, filename, { compression: true });
}

function ConfigPanel() {
  const [presidentLetter, setPresidentLetter] = useState<PresidentLetter>(() => getPresidentLetter());
  const [letterMessage, setLetterMessage] = useState("");
  const updateLetter = (key: keyof PresidentLetter, value: string) => {
    setPresidentLetter((current) => ({ ...current, [key]: value }));
    setLetterMessage("");
  };
  const saveLetter = () => {
    window.localStorage.setItem(presidentLetterStorageKey, JSON.stringify(presidentLetter));
    setLetterMessage("La Carta de bienvenida COPARMEX fue actualizada correctamente.");
  };
  return (
    <div className="card">
      <h3>Configuración institucional</h3>
      <p className="muted">Esta vista muestra únicamente opciones configuradas y disponibles para uso administrativo.</p>
      <section className="president-letter-editor">
        <div className="section-title-row">
          <div>
            <h3>Carta de bienvenida COPARMEX</h3>
            <p>Edita el mensaje institucional que las empresas pueden consultar desde la bienvenida pública.</p>
          </div>
          <button className="secondary" type="button" onClick={openPresidentLetter}><ExternalLink size={17} /> Vista previa</button>
        </div>
        <div className="form-grid">
          <Field label="Título de la carta" value={presidentLetter.title} onChange={(value) => updateLetter("title", value)} transform="none" />
          <Field label="Nombre o firma" value={presidentLetter.presidentName} onChange={(value) => updateLetter("presidentName", value)} transform="none" />
          <Field label="Cargo institucional" value={presidentLetter.presidentRole} onChange={(value) => updateLetter("presidentRole", value)} transform="none" />
          <label className="field president-letter-body">
            <span>Contenido de la carta</span>
            <textarea value={presidentLetter.body} onChange={(event) => updateLetter("body", event.target.value)} />
          </label>
        </div>
        {letterMessage && <div className="save-status success">{letterMessage}</div>}
        <button className="primary" type="button" onClick={saveLetter}>Guardar carta</button>
      </section>
    </div>
  );
}

export default App;
