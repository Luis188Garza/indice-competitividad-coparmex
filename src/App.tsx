import {
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  MessageSquarePlus,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { diagnosticICE } from "./data/diagnosticICE";
import { activityLog, companies, diagnostics, documents, observations, roles } from "./data/mockData";
import { CompanyProfile, DiagnosticResult, SelectedDiagnosticOption } from "./types";
import { loginWithEmail, listenAuthState, logout as firebaseLogout } from "./services/authService";
import { createCompany, getCompanyByAuthUid, listCompanies } from "./services/companiesService";
import { listAccessRequests, saveAccessRequest, updateAccessRequestStatus, type AccessRequestRecord } from "./services/accessRequestsService";
import { getResponsesByCompany, saveDiagnosticResponse } from "./services/diagnosticResponsesService";
import { calculateDiagnostic, trafficLabel } from "./utils/scoring";

type View = "landing" | "about" | "login" | "loginEmpresa" | "loginAdmin" | "requestAccess" | "register" | "questionnaire" | "result" | "company" | "admin" | "stats" | "detail";
type CompanyTab = "dashboard" | "autodiagnostico" | "resultado" | "recomendaciones" | "observaciones" | "perfil" | "documentacion";
type AdminTab = "panel" | "empresas" | "solicitudes" | "diagnosticos" | "estadisticas" | "observaciones" | "reportes" | "configuracion";
type Session = { isAuthenticated: boolean; role: "empresa" | "admin" | null; companyId?: string; adminName?: string };
type AnswerState = Record<string, SelectedDiagnosticOption>;
type AdminCompany = CompanyProfile & { accessStatus?: string; authUid?: string; folio?: string; source?: "firestore" | "mock" };

const diagnosticModules = diagnosticICE.modules.slice().sort((a, b) => a.order - b.order);
const diagnosticQuestions = diagnosticModules.flatMap((module) => module.questions.slice().sort((a, b) => a.order - b.order));

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
    email: String(item.email || ""),
    phone: String(item.phone || ""),
    representative: String(item.representative || ""),
    registeredAt: typeof item.registeredAt === "string" ? item.registeredAt : new Date().toISOString().slice(0, 10),
    followUpStatus: String(item.followUpStatus || item.status || "Sin iniciar") as CompanyProfile["followUpStatus"],
    interestedInAdvisory: Boolean(item.interestedInAdvisory),
    accessStatus: String(item.accessStatus || "active"),
    authUid: item.authUid ? String(item.authUid) : undefined,
    source: "firestore",
  };
}

function getCompanyFolio(company: CompanyProfile | AdminCompany) {
  return "folio" in company && typeof company.folio === "string" && company.folio ? company.folio : company.id;
}

function getAnswerStorageKey(companyId: string) {
  return `ice-diagnostic-answers-${companyId}`;
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
  };
}

function App() {
  const [view, setView] = useState<View>("landing");
  const [companyTab, setCompanyTab] = useState<CompanyTab>("dashboard");
  const [adminTab, setAdminTab] = useState<AdminTab>("panel");
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
  const [saveState, setSaveState] = useState<{ loading: boolean; error: string; success: string }>({ loading: false, error: "", success: "" });
  const skipNextAnswerSave = useRef(false);

  const completedDiagnostics = diagnostics.filter((diagnostic) => diagnostic.status === "Completo" && diagnostic.result);
  const selectedCompany = selectedAdminCompany?.id === selectedCompanyId ? selectedAdminCompany : companies.find((company) => company.id === selectedCompanyId) ?? companies[0];
  const selectedDiagnostic = diagnostics.find((diagnostic) => diagnostic.companyId === selectedCompany.id && diagnostic.result);
  const showcaseDiagnostic = selectedDiagnostic?.result ?? completedDiagnostics[0].result!;
  const sessionCompany = authenticatedCompany ?? companies.find((company) => company.id === session.companyId);
  const activeCompany = sessionCompany ?? (profile.name ? profile : companies[0]);
  const activeDiagnostic = diagnostics.find((diagnostic) => diagnostic.companyId === activeCompany.id && diagnostic.result);
  const activeResult = result ?? latestCompanyResult ?? (authenticatedCompany ? null : activeDiagnostic?.result ?? showcaseDiagnostic);
  const activeCompanyId = activeCompany.id;
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
        setLatestResultError(error instanceof Error ? error.message : "No fue posible consultar diagnósticos guardados.");
      })
      .finally(() => {
        if (mounted) setLatestResultLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [authenticatedCompany?.id]);

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
        // El login muestra los errores operativos; el listener solo intenta restaurar sesi?n.
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
    if (!session.isAuthenticated) return;

    const fallbackView = session.role === "admin" ? "admin" : "company";
    window.history.replaceState({ iceView: view }, "", window.location.href);
    const handlePopState = () => {
      setView(fallbackView);
      window.history.pushState({ iceView: fallbackView }, "", window.location.href);
    };

    window.history.pushState({ iceView: fallbackView }, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [session.isAuthenticated, session.role, view]);

  const stats = useMemo(() => {
    const average = Math.round(completedDiagnostics.reduce((sum, diagnostic) => sum + diagnostic.result!.percentage, 0) / completedDiagnostics.length);
    const highRisk = completedDiagnostics.filter((diagnostic) => diagnostic.result!.percentage < 50).length;
    const solid = completedDiagnostics.filter((diagnostic) => diagnostic.result!.percentage >= 70).length;
    const advisory = companies.filter((company) => company.interestedInAdvisory).length;
    const pending = diagnostics.filter((diagnostic) => diagnostic.status === "Pendiente").length;
    const moduleAverages = diagnosticModules.map((module) => {
      const values = completedDiagnostics.map((diagnostic) => diagnostic.result!.moduleScores.find((score) => score.moduleId === module.id)!.percentage);
      return { title: module.title, value: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) };
    });
    const sectors = [...new Set(companies.map((company) => company.sector))].map((sector) => ({
      sector,
      count: companies.filter((company) => company.sector === sector).length,
      average: Math.round(
        completedDiagnostics
          .filter((diagnostic) => companies.find((company) => company.id === diagnostic.companyId)?.sector === sector)
          .reduce((sum, diagnostic, _, array) => sum + diagnostic.result!.percentage / Math.max(array.length, 1), 0),
      ),
    }));
    return { average, highRisk, solid, advisory, pending, moduleAverages, sectors };
  }, [completedDiagnostics]);

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
      });
      window.localStorage.removeItem(getAnswerStorageKey(activeCompany.id));
      skipNextAnswerSave.current = true;
      setAnswers({});
      setLatestCompanyResult(nextResult);
      setSaveState({ loading: false, error: "", success: `Diagnóstico guardado correctamente. Folio de respuesta: ${responseId}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible guardar el diagnóstico en Firestore.";
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
      throw new Error("El acceso de esta empresa no está activo.");
    }

    setAuthenticatedCompany(company);
    window.localStorage.setItem("ice-current-company", JSON.stringify(company));
    setSession({ isAuthenticated: true, role: "empresa", companyId: company.id });
    setSelectedCompanyId(company.id);
    setView("company");
  };

  const loginAdmin = (user: string, password: string) => {
    if (user.trim().toLowerCase() === "admin@coparmexnld.org.mx" && password === "admin123") {
      setSession({ isAuthenticated: true, role: "admin", adminName: "Administrador COPARMEX" });
      window.localStorage.setItem("ice-admin-session", JSON.stringify({ isAuthenticated: true, role: "admin", adminName: "Administrador COPARMEX" }));
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
        {authReady && view === "about" && <AboutIndex />}
        {authReady && view === "login" && <AccessHub onCompany={() => setView("loginEmpresa")} onAdmin={() => setView("loginAdmin")} />}
        {authReady && view === "loginEmpresa" && <CompanyLogin onLogin={loginCompany} />}
        {authReady && view === "loginAdmin" && <AdminLogin onLogin={loginAdmin} />}
        {authReady && view === "requestAccess" && <AccessRequestScreen onBack={() => setView("landing")} />}
        {authReady && view === "register" && <Register profile={profile} setProfile={setProfile} onNext={() => setView("questionnaire")} />}
        {authReady && view === "questionnaire" && (
          <Questionnaire
            currentModule={currentModule}
            setCurrentModule={setCurrentModule}
            answers={answers}
            setAnswers={setAnswers}
            currentQuestions={currentQuestions}
            progress={progress}
            onComplete={completeDiagnostic}
          />
        )}
        {authReady && view === "result" && result && (
          <ResultScreen company={activeCompany} result={result} saveState={saveState} onPdf={simulatePdf} onPortal={() => { setSession({ isAuthenticated: true, role: "empresa", companyId: session.companyId }); setView("company"); }} />
        )}
        {authReady && view === "company" && session.role === "empresa" && (
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
  const companyTabs: CompanyTab[] = ["dashboard", "autodiagnostico", "resultado", "recomendaciones", "observaciones", "perfil", "documentacion"];
  const adminTabs: AdminTab[] = ["panel", "empresas", "solicitudes", "diagnosticos", "estadisticas", "observaciones", "reportes", "configuracion"];
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
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">Herramienta institucional COPARMEX Nuevo Laredo</span>
        <h1>Índice de Competitividad Empresarial</h1>
        <p>Diagnóstico de madurez corporativa para empresas afiliadas a COPARMEX Nuevo Laredo.</p>
        <div className="hero-actions">
          <button className="primary" onClick={onPortal}>Iniciar sesión</button>
          <button className="secondary" onClick={onRequestAccess}>Solicitar acceso</button>
        </div>
      </div>
      <div className="hero-panel">
        <div className="metric-large">7 a 10 min</div>
        <p>Identifica áreas de riesgo, cumplimiento y oportunidad mediante módulos corporativos accionables.</p>
        <div className="hero-grid">
          {["Cumplimiento global", "Semáforo corporativo", "Recomendaciones", "Indicador regional"].map((item) => <span key={item}>{item}</span>)}
        </div>
      </div>
    </section>
  );
}

function AboutIndex() {
  return (
    <section className="page">
      <SectionTitle title="Acerca del índice" subtitle="El Índice de Competitividad Empresarial permite evaluar madurez corporativa, brechas de cumplimiento y oportunidades de seguimiento institucional para empresas de Nuevo Laredo." />
      <div className="kpi-grid">
        <Kpi icon={<ShieldCheck />} label="Enfoque" value="Madurez corporativa" />
        <Kpi icon={<ClipboardList />} label="Estructura" value="7 módulos" />
        <Kpi icon={<BarChart3 />} label="Salida" value="Indicador regional" />
      </div>
      <TwoColumns
        left={<InsightList title="Alcance empresarial" items={["Diagnóstico rápido de 7 a 10 minutos.", "Resultado por módulos con semáforo corporativo.", "Recomendaciones automáticas y acciones sugeridas."]} />}
        right={<InsightList title="Alcance institucional" items={["Seguimiento administrativo por empresa.", "Estadística agregada por sector.", "Base preparada para reportes y expedientes documentales."]} />}
      />
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
          <span>Consulta dashboard, autodiagnóstico, resultado, recomendaciones y expediente documental.</span>
        </button>
        <button className="access-card" onClick={onAdmin}>
          <LockKeyhole size={34} />
          <strong>Acceso administrador</strong>
          <span>Gestiona empresas, diagnósticos, estadísticas, observaciones y reportes institucionales.</span>
        </button>
      </div>
    </section>
  );
}

function AccessRequestScreen({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState({
    folio: "",
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    sector: "Administración y desarrollo empresarial",
    city: "Nuevo Laredo",
    state: "Tamaulipas",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async () => {
    setError("");
    setSuccess("");

    if (!form.folio || !form.companyName || !form.contactName || !form.email) {
      setError("Captura folio, empresa, contacto y correo autorizado.");
      return;
    }

    setLoading(true);
    try {
      const requestId = await saveAccessRequest(form);
      setSuccess(`Solicitud enviada correctamente. Folio de solicitud: ${requestId}`);
      setForm({ folio: "", companyName: "", contactName: "", email: "", phone: "", sector: "Administración y desarrollo empresarial", city: "Nuevo Laredo", state: "Tamaulipas", message: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible enviar la solicitud de acceso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page narrow">
      <SectionTitle title="Solicitar acceso" subtitle="Solicitud para empresas previamente registradas por COPARMEX Nuevo Laredo. El acceso queda sujeto a validación administrativa." />
      <div className="login-card">
        <Field label="Folio asignado por COPARMEX" value={form.folio} onChange={(value) => update("folio", value)} />
        <Field label="Nombre de empresa" value={form.companyName} onChange={(value) => update("companyName", value)} />
        <Field label="Nombre del contacto" value={form.contactName} onChange={(value) => update("contactName", value)} />
        <Select
          label="Sector"
          value={form.sector}
          onChange={(value) => update("sector", value)}
          options={["Administración y desarrollo empresarial", "Servicios legales", "Logística y operación", "Servicios notariales", "Gestión empresarial", "Comercio", "Industria", "Servicios profesionales", "Tecnología"]}
        />
        <Field label="Correo autorizado" value={form.email} onChange={(value) => update("email", value)} />
        <Field label="Teléfono" value={form.phone} onChange={(value) => update("phone", value)} />
        <Field label="Ciudad" value={form.city} onChange={(value) => update("city", value)} />
        <Field label="Estado" value={form.state} onChange={(value) => update("state", value)} />
        <Field label="Mensaje u observación" value={form.message} onChange={(value) => update("message", value)} />
        {error && <p className="form-error">{error}</p>}
        {success && <p className="save-status success">{success}</p>}
        <div className="notice"><ShieldCheck size={18} /> El administrador podrá autorizar o rechazar la solicitud después de validar que la empresa corresponda al padrón institucional.</div>
        <div className="actions-row">
          <button className="primary" onClick={submit} disabled={loading}>{loading ? "Enviando..." : "Enviar solicitud"}</button>
          <button className="secondary" onClick={onBack}>Volver al inicio</button>
        </div>
      </div>
    </section>
  );
}

function CompanyLogin({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
      setError(err instanceof Error ? err.message : "No fue posible iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="page narrow">
      <SectionTitle title="Acceso empresa" subtitle="Utiliza el correo autorizado por COPARMEX Nuevo Laredo." />
      <div className="login-card">
        <Field label="Correo" value={email} onChange={setEmail} />
        <PasswordField label="Contraseña" value={password} onChange={setPassword} />
        {error && <p className="form-error">{error}</p>}
        {success && <p className="save-status success">{success}</p>}
        <button className="primary" onClick={submit} disabled={loading || !email || !password}>{loading ? "Validando acceso..." : "Ingresar al portal empresa"}</button>
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
        <Field label="Usuario o correo" value={user} onChange={setUser} />
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
      <SectionTitle title="Identificación de empresa" subtitle="Estos datos permiten generar el reporte, construir estadística agregada y habilitar seguimiento institucional." />
      <div className="form-grid">
        <Field label="Nombre de la empresa" value={profile.name} onChange={(value) => update("name", value)} />
        <Select label="Sector económico" value={profile.sector} onChange={(value) => update("sector", value)} options={["Servicios legales", "Logística y operación", "Administración y desarrollo empresarial", "Servicios notariales", "Comercio", "Construcción", "Industria", "Servicios profesionales", "Tecnología"]} />
        <Select label="Número aproximado de empleados" value={profile.employees} onChange={(value) => update("employees", value)} options={["1-10", "11-30", "31-50", "51-100", "101-250", "251+"]} />
        <Select label="Antigüedad de la empresa" value={profile.years} onChange={(value) => update("years", value)} options={["1-2 años", "3-5 años", "6-10 años", "Más de 10 años"]} />
        <Field label="Correo electrónico de contacto" value={profile.email} onChange={(value) => update("email", value)} />
        <Field label="Teléfono" value={profile.phone} onChange={(value) => update("phone", value)} />
        <Field label="Representante o contacto principal" value={profile.representative} onChange={(value) => update("representative", value)} />
      </div>
      <div className="notice"><ShieldCheck size={18} /> La información se trata bajo confidencialidad, aviso de privacidad y uso agregado para indicadores regionales.</div>
      <button className="primary" onClick={onNext} disabled={!profile.name || !profile.email || !profile.representative}>Continuar al diagnóstico</button>
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
}) {
  const module = diagnosticModules[props.currentModule];
  const canAdvance = props.currentQuestions.every((question) => props.answers[question.id] !== undefined);
  const moduleScore = props.currentQuestions.reduce((sum, question) => sum + (props.answers[question.id]?.points ?? 0), 0);
  const modulePercentage = Math.round((moduleScore / module.maxPoints) * 100);
  return (
    <section className="page">
      <div className="split-title">
        <SectionTitle title={module.title} subtitle={`${diagnosticICE.subtitle}. Módulo ${props.currentModule + 1} de ${diagnosticModules.length}. Puntaje del módulo: ${moduleScore}/${module.maxPoints} (${modulePercentage}%).`} />
        <ProgressRing value={props.progress} label="Avance general" />
      </div>
      <div className="progress"><span style={{ width: `${props.progress}%` }} /></div>
      <div className="question-list">
        {props.currentQuestions.map((question) => (
          <article className="question-card" key={question.id}>
            <span className="question-id">{question.id}</span>
            <h3>{question.text}</h3>
            <div className="segmented">
              {question.options.map((option) => (
                <button
                  key={option.label}
                  className={props.answers[question.id]?.label === option.label ? "active" : ""}
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
        <button className="secondary" disabled={props.currentModule === 0} onClick={() => props.setCurrentModule(props.currentModule - 1)}>Anterior</button>
        {props.currentModule < diagnosticModules.length - 1 ? (
          <button className="primary" disabled={!canAdvance} onClick={() => props.setCurrentModule(props.currentModule + 1)}>Siguiente sección</button>
        ) : (
          <button className="primary" disabled={!canAdvance} onClick={props.onComplete}>Generar resultado</button>
        )}
      </div>
    </section>
  );
}

function ResultScreen({ company, result, saveState, onPdf, onPortal }: { company: CompanyProfile; result: DiagnosticResult; saveState: { loading: boolean; error: string; success: string }; onPdf: () => void; onPortal: () => void }) {
  return (
    <section className="page printable">
      <ResultHeader company={company} result={result} />
      {(saveState.loading || saveState.error || saveState.success) && (
        <div className={`save-status ${saveState.error ? "error" : saveState.success ? "success" : ""}`}>
          {saveState.loading && "Guardando diagnóstico en Firestore..."}
          {saveState.error && saveState.error}
          {saveState.success && saveState.success}
        </div>
      )}
      <ModuleBars scores={result.moduleScores} />
      <TwoColumns
        left={<InsightList title="Principales hallazgos" items={result.findings} />}
        right={<InsightList title="Recomendaciones prioritarias" items={result.recommendations} />}
      />
      <div className="action-cards">
        <button className="post-action-button"><FileText size={20} /><strong>Solicitar revisión documental</strong><span>Enviar expediente a validación institucional.</span></button>
        <button className="post-action-button"><UserRoundCheck size={20} /><strong>Agendar asesoría especializada</strong><span>Canalizar seguimiento con un asesor autorizado.</span></button>
        <button className="post-action-button"><ShieldCheck size={20} /><strong>Autorizar seguimiento COPARMEX</strong><span>Permitir contacto institucional posterior.</span></button>
      </div>
      <div className="actions-row">
        <button className="secondary" onClick={onPdf}><Download size={18} /> Descargar reporte PDF</button>
        <button className="primary" onClick={onPortal}>Volver al dashboard</button>
      </div>
    </section>
  );
}

function CompanyPortal({ tab, setTab, company, result, loadingResult, resultError, onStart, onPdf }: { tab: CompanyTab; setTab: (tab: CompanyTab) => void; company: CompanyProfile; result: DiagnosticResult | null; loadingResult: boolean; resultError: string; onStart: () => void; onPdf: () => void }) {
  const tabs: CompanyTab[] = ["dashboard", "autodiagnostico", "resultado", "recomendaciones", "observaciones", "perfil", "documentacion"];
  return (
    <section className="portal">
      <Sidebar title="Portal empresa" items={tabs} active={tab} onSelect={setTab} />
      <div className="portal-content">
        {tab === "dashboard" && <CompanyDashboard company={company} result={result} loadingResult={loadingResult} resultError={resultError} onStart={onStart} onResults={() => setTab("resultado")} />}
        {tab === "autodiagnostico" && <PrepPanel onStart={onStart} />}
        {tab === "resultado" && (result ? <ResultScreen company={company} result={result} saveState={{ loading: false, error: "", success: "" }} onPdf={onPdf} onPortal={() => setTab("dashboard")} /> : <EmptyDiagnosticState company={company} onStart={onStart} loading={loadingResult} error={resultError} />)}
        {tab === "recomendaciones" && (result ? <InsightList title="Plan de acción recomendado" items={result.recommendations} /> : <EmptyDiagnosticState company={company} onStart={onStart} loading={loadingResult} error={resultError} />)}
        {tab === "observaciones" && <ObservationList companyId={company.id} />}
        {tab === "perfil" && <ProfileCard company={company} result={result} />}
        {tab === "documentacion" && <DocumentsPanel companyId={company.id} />}
      </div>
    </section>
  );
}

function AdminPortal(props: { tab: AdminTab; setTab: (tab: AdminTab) => void; stats: any; selectedCompanyId: string; setSelectedCompanyId: (id: string) => void; setSelectedAdminCompany: (company: AdminCompany | null) => void; setView: (view: View) => void; onPdf: () => void }) {
  const [companyDraft, setCompanyDraft] = useState<AccessRequestRecord | null>(null);
  const tabs: AdminTab[] = ["panel", "empresas", "solicitudes", "diagnosticos", "estadisticas", "observaciones", "reportes", "configuracion"];
  const useRequestForCompany = (request: AccessRequestRecord) => {
    setCompanyDraft(request);
    props.setTab("empresas");
  };
  return (
    <section className="portal">
      <Sidebar title="Panel administrativo" items={tabs} active={props.tab} onSelect={props.setTab} />
      <div className="portal-content">
        {props.tab === "panel" && <AdminDashboard stats={props.stats} />}
        {props.tab === "empresas" && <CompaniesTable companyDraft={companyDraft} clearCompanyDraft={() => setCompanyDraft(null)} setSelectedCompanyId={props.setSelectedCompanyId} setSelectedAdminCompany={props.setSelectedAdminCompany} setView={props.setView} onPdf={props.onPdf} />}
        {props.tab === "solicitudes" && <AccessRequestsPanel onUseForCompany={useRequestForCompany} />}
        {props.tab === "diagnosticos" && <DiagnosticsPanel />}
        {props.tab === "estadisticas" && <RegionalStats stats={props.stats} compact />}
        {props.tab === "observaciones" && <AllObservations />}
        {props.tab === "reportes" && <ReportsPanel onPdf={props.onPdf} />}
        {props.tab === "configuracion" && <ConfigPanel />}
      </div>
    </section>
  );
}

function AccessRequestsPanel({ onUseForCompany }: { onUseForCompany: (request: AccessRequestRecord) => void }) {
  const [requests, setRequests] = useState<AccessRequestRecord[]>([]);
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
      .catch((err) => setError(err instanceof Error ? err.message : "No fue posible cargar solicitudes."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const markRequest = async (requestId: string, status: "approved" | "rejected") => {
    setMessage("");
    setError("");
    try {
      await updateAccessRequestStatus(requestId, status);
      setRequests((current) => current.map((request) => request.id === requestId ? { ...request, status } : request));
      setMessage(status === "approved" ? "Solicitud autorizada." : "Solicitud rechazada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar la solicitud.");
    }
  };

  return (
    <>
      <SectionTitle title="Solicitudes de acceso" subtitle="Revisión administrativa de empresas que solicitan acceso al portal ICE." />
      {loading && <div className="save-status">Cargando solicitudes...</div>}
      {error && <div className="save-status error">{error}</div>}
      {message && <div className="save-status success">{message}</div>}
      {!loading && !requests.length && <div className="card prepared"><FileText size={32} /><h2>Sin solicitudes pendientes</h2><p>Las solicitudes enviadas desde la portada aparecerán en esta sección.</p></div>}
      <div className="request-grid">
        {requests.map((request) => (
          <article className="request-card" key={request.id}>
            <div className="company-card-head">
              <span>{request.folio || "Sin folio"}</span>
              <Badge tone={request.status === "approved" ? "verde" : request.status === "rejected" ? "rojo" : "amarillo"}>{request.status === "approved" ? "Autorizada" : request.status === "rejected" ? "Rechazada" : "Pendiente"}</Badge>
            </div>
            <h3>{request.companyName}</h3>
            <div className="mobile-detail-grid">
              <p><span>Contacto</span><strong>{request.contactName}</strong></p>
              <p><span>Correo</span><strong>{request.email}</strong></p>
              <p><span>Teléfono</span><strong>{request.phone || "No capturado"}</strong></p>
              <p><span>Sector</span><strong>{request.sector || "No capturado"}</strong></p>
              <p><span>Ciudad</span><strong>{request.city || "Nuevo Laredo"}</strong></p>
              <p><span>Estado</span><strong>{request.state || "Tamaulipas"}</strong></p>
            </div>
            {request.message && <p className="note"><strong>Observación</strong><span>{request.message}</span></p>}
            <div className="actions-row">
              <button className="primary" onClick={() => onUseForCompany(request)}>Usar datos para alta</button>
              <button className="secondary" onClick={() => markRequest(request.id, "approved")}>Autorizar</button>
              <button className="secondary" onClick={() => markRequest(request.id, "rejected")}>Rechazar</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function AdminDashboard({ stats }: { stats: any }) {
  return (
    <>
      <SectionTitle title="Panel general COPARMEX" subtitle="Seguimiento ejecutivo de empresas participantes, madurez corporativa y brechas regionales." />
      <div className="kpi-grid">
        <Kpi icon={<Building2 />} label="Empresas participantes" value={companies.length} />
        <Kpi icon={<BarChart3 />} label="Promedio general" value={`${stats.average}%`} />
        <Kpi icon={<ShieldCheck />} label="Empresas en alto riesgo" value={stats.highRisk} />
        <Kpi icon={<CheckCircle2 />} label="Madurez sólida" value={stats.solid} />
        <Kpi icon={<UserRoundCheck />} label="Interesadas en asesoría" value={stats.advisory} />
        <Kpi icon={<ClipboardList />} label="Diagnósticos pendientes" value={stats.pending} />
      </div>
      <div className="dashboard-grid">
        <ChartBlock title="Promedio por módulo" data={stats.moduleAverages} />
        <LevelDistribution />
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
      <ResultHeader company={company} result={result} compact />
      <div className="kpi-grid">
        <Kpi icon={<LayoutDashboard />} label="Folio institucional" value={getCompanyFolio(company)} />
        <Kpi icon={<BarChart3 />} label="Cumplimiento global" value={`${result.percentage}%`} />
        <Kpi icon={<ShieldCheck />} label="Semáforo" value={trafficLabel(result.maturity.trafficLight)} />
        <Kpi icon={<FileText />} label="Observaciones nuevas" value={observations.filter((obs) => obs.companyId === company.id).length} />
      </div>
      <TwoColumns left={<ModuleBars scores={result.moduleScores} />} right={<InsightList title="Acciones recomendadas" items={result.recommendations.slice(0, 4)} />} />
      <div className="actions-row">
        <button className="primary" onClick={onResults}>Ver resultados</button>
        <button className="secondary" onClick={onStart}>Realizar nuevo diagnóstico</button>
      </div>
    </>
  );
}

function EmptyDiagnosticState({ company, onStart, loading, error }: { company: CompanyProfile; onStart: () => void; loading: boolean; error: string }) {
  return (
    <div className="card prepared empty-diagnostic">
      <ClipboardList size={34} />
      <h2>Aún no has realizado tu autodiagnóstico ICE.</h2>
      <p>Cuando completes el diagnóstico, aquí se mostrará el porcentaje de cumplimiento, nivel de madurez, semáforo corporativo y recomendaciones de {company.name}.</p>
      {loading && <div className="save-status">Consultando diagnósticos guardados...</div>}
      {error && <div className="save-status error">{error}</div>}
      <div className="kpi-grid">
        <Kpi icon={<LayoutDashboard />} label="Folio institucional" value={getCompanyFolio(company)} />
        <Kpi icon={<Building2 />} label="Empresa" value={company.name} />
        <Kpi icon={<FileText />} label="Sector" value={company.sector} />
        <Kpi icon={<ShieldCheck />} label="Estado" value={company.state} />
      </div>
      <button className="primary" onClick={onStart}>Iniciar diagnóstico</button>
    </div>
  );
}

function CompaniesTable({ companyDraft, clearCompanyDraft, setSelectedCompanyId, setSelectedAdminCompany, setView, onPdf }: { companyDraft: AccessRequestRecord | null; clearCompanyDraft: () => void; setSelectedCompanyId: (id: string) => void; setSelectedAdminCompany: (company: AdminCompany | null) => void; setView: (view: View) => void; onPdf: () => void }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [firestoreCompanies, setFirestoreCompanies] = useState<AdminCompany[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companiesError, setCompaniesError] = useState("");
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [companySaveMessage, setCompanySaveMessage] = useState("");
  const [companySaveError, setCompanySaveError] = useState("");
  const [newCompany, setNewCompany] = useState({
    folio: "",
    name: "",
    sector: "Administración y desarrollo empresarial",
    representative: "",
    city: "Nuevo Laredo",
    state: "Tamaulipas",
    email: "",
    phone: "",
    followUpStatus: "Sin iniciar",
  });

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
        if (mounted) setCompaniesError("No fue posible cargar empresas desde Firestore. Se muestra el listado institucional local.");
      })
      .finally(() => {
        if (mounted) setLoadingCompanies(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!companyDraft) return;
    setNewCompany({
      folio: companyDraft.folio || "",
      name: companyDraft.companyName || "",
      sector: companyDraft.sector || "Administración y desarrollo empresarial",
      representative: companyDraft.contactName || "",
      city: companyDraft.city || "Nuevo Laredo",
      state: companyDraft.state || "Tamaulipas",
      email: companyDraft.email || "",
      phone: companyDraft.phone || "",
      followUpStatus: "Sin iniciar",
    });
    setShowNewCompany(true);
    setCompanySaveMessage("Datos de solicitud cargados en el formulario de alta.");
    clearCompanyDraft();
  }, [companyDraft, clearCompanyDraft]);

  const displayCompanies: AdminCompany[] = [
    ...firestoreCompanies,
    ...companies
      .filter((company) => !firestoreCompanies.some((item) => item.id === company.id))
      .map((company) => ({ ...company, source: "mock" as const })),
  ];

  const companyRows = displayCompanies.map((company) => ({
    company,
    diagnostic: diagnostics.find((item) => item.companyId === company.id && item.result),
    observations: observations.filter((observation) => observation.companyId === company.id).length,
  }));
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
  const saveNewCompany = async () => {
    const folio = newCompany.folio.trim().toUpperCase();
    const name = newCompany.name.trim();
    const email = newCompany.email.trim();

    setCompanySaveMessage("");
    setCompanySaveError("");

    if (!folio || !name || !email) {
      setCompanySaveError("Captura folio, nombre de empresa y correo autorizado.");
      return;
    }

    setSavingCompany(true);
    try {
      await createCompany({
        id: folio,
        folio,
        name,
        sector: newCompany.sector,
        representative: newCompany.representative,
        city: newCompany.city,
        state: newCompany.state,
        email,
        phone: newCompany.phone,
        followUpStatus: newCompany.followUpStatus,
        registeredAt: new Date().toISOString().slice(0, 10),
        interestedInAdvisory: false,
        status: "Activa",
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
        phone: newCompany.phone,
        employees: "No especificado",
        years: "No especificado",
        registeredAt: new Date().toISOString().slice(0, 10),
        followUpStatus: newCompany.followUpStatus as CompanyProfile["followUpStatus"],
        interestedInAdvisory: false,
        source: "firestore",
      };

      setFirestoreCompanies((current) => [created, ...current.filter((company) => company.id !== folio)]);
      setCompanySaveMessage("Empresa registrada correctamente en Firestore.");
      setShowNewCompany(false);
      setNewCompany({
        folio: "",
        name: "",
        sector: "Administración y desarrollo empresarial",
        representative: "",
        city: "Nuevo Laredo",
        state: "Tamaulipas",
        email: "",
        phone: "",
        followUpStatus: "Sin iniciar",
      });
    } catch (error) {
      setCompanySaveError(error instanceof Error ? error.message : "No fue posible guardar la empresa.");
    } finally {
      setSavingCompany(false);
    }
  };

  return (
    <>
      <div className="section-title-row">
        <SectionTitle title="Empresas" subtitle="Listado operativo para seguimiento institucional, observaciones y reportes." />
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
            <Field label="Folio" value={newCompany.folio} onChange={(value) => updateNewCompany("folio", value)} />
            <Field label="Nombre de empresa" value={newCompany.name} onChange={(value) => updateNewCompany("name", value)} />
            <Select
              label="Sector"
              value={newCompany.sector}
              onChange={(value) => updateNewCompany("sector", value)}
              options={["Administración y desarrollo empresarial", "Servicios legales", "Logística y operación", "Servicios notariales", "Gestión empresarial", "Comercio", "Industria", "Servicios profesionales", "Tecnología"]}
            />
            <Field label="Representante" value={newCompany.representative} onChange={(value) => updateNewCompany("representative", value)} />
            <Field label="Ciudad" value={newCompany.city} onChange={(value) => updateNewCompany("city", value)} />
            <Field label="Estado" value={newCompany.state} onChange={(value) => updateNewCompany("state", value)} />
            <Field label="Correo autorizado" value={newCompany.email} onChange={(value) => updateNewCompany("email", value)} />
            <Field label="Teléfono" value={newCompany.phone} onChange={(value) => updateNewCompany("phone", value)} />
            <Select
              label="Seguimiento"
              value={newCompany.followUpStatus}
              onChange={(value) => updateNewCompany("followUpStatus", value)}
              options={["Sin iniciar", "En seguimiento", "Asesoría solicitada", "Cerrado"]}
            />
          </div>
          <div className="actions-row">
            <button className="primary" onClick={saveNewCompany} disabled={savingCompany}>{savingCompany ? "Guardando..." : "Guardar empresa"}</button>
            <button className="secondary" onClick={() => setShowNewCompany(false)}>Cancelar</button>
          </div>
        </div>
      )}
      <div className="admin-company-table">
        <div className="admin-company-row admin-company-head">
          <span>Folio</span>
          <span>Empresa</span>
          <span>Sector</span>
          <span>Representante</span>
          <span>Nivel</span>
          <span>%</span>
          <span>Semáforo</span>
          <span>Observaciones</span>
          <span>Seguimiento</span>
          <span>Acciones</span>
        </div>
        {companyRows.map(({ company, diagnostic, observations: companyObservations }) => (
          <div className="admin-company-row" key={company.id}>
            <span>{getCompanyFolio(company)}</span>
            <span className="company-cell">{company.name}</span>
            <span>{company.sector}</span>
            <span>{company.representative}</span>
            <span>{diagnostic?.result?.maturity.title ?? "Pendiente"}</span>
            <span>{diagnostic?.result?.percentage ?? "-"}%</span>
            <span><Badge tone={diagnostic?.result?.maturity.trafficLight ?? "amarillo"}>{diagnostic?.result ? trafficLabel(diagnostic.result.maturity.trafficLight) : "Pendiente"}</Badge></span>
            <span>{companyObservations}</span>
            <span>{company.followUpStatus}</span>
            <span className="table-actions">
              <ActionMenu
                companyId={company.id}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
                onDetail={() => openDetail(company)}
                onReport={downloadReport}
              />
            </span>
          </div>
        ))}
      </div>
      <div className="company-card-list">
        {companyRows.map(({ company, diagnostic, observations: companyObservations }) => (
          <article className="company-admin-card" key={company.id}>
            <div className="company-card-head">
              <span>{getCompanyFolio(company)}</span>
              <ActionMenu
                companyId={company.id}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
                onDetail={() => openDetail(company)}
                onReport={downloadReport}
              />
            </div>
            <h3>{company.name}</h3>
            <div className="mobile-detail-grid">
              <p><span>Sector</span><strong>{company.sector}</strong></p>
              <p><span>Representante</span><strong>{company.representative}</strong></p>
              <p><span>Nivel</span><strong>{diagnostic?.result?.maturity.title ?? "Pendiente"}</strong></p>
              <p><span>Porcentaje</span><strong>{diagnostic?.result?.percentage ?? "-"}%</strong></p>
              <p><span>Semáforo</span><Badge tone={diagnostic?.result?.maturity.trafficLight ?? "amarillo"}>{diagnostic?.result ? trafficLabel(diagnostic.result.maturity.trafficLight) : "Pendiente"}</Badge></p>
              <p><span>Observaciones</span><strong>{companyObservations}</strong></p>
              <p><span>Seguimiento</span><strong>{company.followUpStatus}</strong></p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function ActionMenu({ companyId, openMenu, setOpenMenu, onDetail, onReport }: { companyId: string; openMenu: string | null; setOpenMenu: (id: string | null) => void; onDetail: () => void; onReport: () => void }) {
  const isOpen = openMenu === companyId;
  return (
    <div className="action-menu-wrap">
      <button className="kebab-action" aria-label="Más acciones" title="Más acciones" onClick={() => setOpenMenu(isOpen ? null : companyId)}>⋯</button>
      {isOpen && (
        <div className="action-menu">
          <button onClick={onDetail}><Eye size={15} /> Ver detalle</button>
          <button onClick={onReport}><FileText size={15} /> Descargar reporte</button>
          <button onClick={() => setOpenMenu(null)}><MessageSquarePlus size={15} /> Agregar observación</button>
        </div>
      )}
    </div>
  );
}

function CompanyDetail({ company, result, onBack, onPdf }: { company: CompanyProfile; result: DiagnosticResult; onBack: () => void; onPdf: () => void }) {
  return (
    <section className="page">
      <button className="back-link" onClick={onBack}>← Volver a empresas</button>
      <ResultHeader company={company} result={result} />
      <TwoColumns left={<ProfileCard company={company} result={result} />} right={<InsightList title="Recomendaciones generadas" items={result.recommendations} />} />
      <ModuleBars scores={result.moduleScores} />
      <TwoColumns left={<ObservationList companyId={company.id} />} right={<ActivityPanel companyId={company.id} />} />
      <DocumentsPanel companyId={company.id} />
      <button className="secondary" onClick={onPdf}><Download size={18} /> Descargar reporte</button>
    </section>
  );
}

function RegionalStats({ stats, compact = false }: { stats: any; compact?: boolean }) {
  return (
    <section className={compact ? "" : "page"}>
      <SectionTitle title="Índice de Competitividad Empresarial de Nuevo Laredo" subtitle="Estadística agregada para construir indicadores regionales sin exponer información confidencial de empresas." />
      <div className="kpi-grid">
        <Kpi icon={<FileText />} label="Libros corporativos actualizados" value="46%" />
        <Kpi icon={<ShieldCheck />} label="Poderes notariales vigentes" value="63%" />
        <Kpi icon={<UserRoundCheck />} label="Acuerdos entre socios" value="41%" />
        <Kpi icon={<LockKeyhole />} label="Beneficiario controlador" value="58%" />
      </div>
      <div className="dashboard-grid">
        <ChartBlock title="Promedio de cumplimiento por sector" data={stats.sectors.map((sector: any) => ({ title: sector.sector, value: sector.average || 18 }))} />
        <ChartBlock title="Módulos con menor calificación" data={[...stats.moduleAverages].sort((a, b) => a.value - b.value).slice(0, 5)} />
      </div>
    </section>
  );
}

function ResultHeader({ company, result, compact = false }: { company: CompanyProfile; result: DiagnosticResult; compact?: boolean }) {
  return (
    <div className="result-header">
      <div>
        <span className="eyebrow">{company.name || "Empresa participante"}</span>
        <h2>{compact ? "Dashboard empresa" : "Resultado del diagnóstico"}</h2>
        <p>{result.maturity.message}</p>
      </div>
      <div className={`score-card ${result.maturity.trafficLight}`}>
        <strong>{result.percentage}%</strong>
        <span>Nivel {result.maturity.level} - {result.maturity.title}</span>
        <small>Semáforo {trafficLabel(result.maturity.trafficLight)}</small>
      </div>
    </div>
  );
}

function ModuleBars({ scores }: { scores: DiagnosticResult["moduleScores"] }) {
  return (
    <div className="card">
      <h3>Resultados por módulo</h3>
      {scores.map((score) => (
        <div className="bar-row" key={score.moduleId}>
          <span>{score.title}</span><strong>{score.percentage}%</strong>
          <div className="bar"><i style={{ width: `${score.percentage}%` }} /></div>
        </div>
      ))}
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
  const labels: Record<string, string> = { autodiagnostico: "Autodiagnóstico", documentacion: "Documentación", estadisticas: "Estadísticas", configuracion: "Configuración", diagnosticos: "Diagnósticos", solicitudes: "Solicitudes" };
  return labels[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><input type="password" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
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

function LevelDistribution() {
  const data = [4, 3, 2, 1, 0].map((level) => ({ title: `Nivel ${level}`, value: completedLevel(level) * 12 }));
  return <ChartBlock title="Empresas por nivel de madurez" data={data} />;
}

function completedLevel(level: number) {
  return diagnostics.filter((diagnostic) => diagnostic.result?.maturity.level === level).length;
}

function PrepPanel({ onStart }: { onStart: () => void }) {
  const previewQuestions = diagnosticModules[0].questions.slice().sort((a, b) => a.order - b.order).slice(0, 2);
  return (
    <div className="diagnostic-preview">
      <div className="card prepared">
        <ClipboardList size={34} />
        <h2>Autodiagnóstico por módulos</h2>
        <p>El cuestionario evalúa constitución, gobierno corporativo, libros, representación legal, contratos, cumplimiento y continuidad empresarial.</p>
        <div className="progress"><span style={{ width: "14%" }} /></div>
        <div className="module-status"><strong>Módulo 1 de {diagnosticModules.length}</strong><span>{diagnosticModules[0].title}</span></div>
      </div>
      <div className="question-list preview-questions">
        {previewQuestions.map((question, index) => (
          <article className="question-card" key={question.id}>
            <span className="question-id">{question.id}</span>
            <h3>{question.text}</h3>
            <div className="segmented">
              {question.options.map((option) => (
                <button key={option.label} className={index === 0 && option.label === "Sí" ? "active" : ""}>{option.label}</button>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="actions-row">
        <button className="primary" onClick={onStart}>Actualizar diagnóstico</button>
      </div>
    </div>
  );
}

function ObservationList({ companyId }: { companyId: string }) {
  const list = observations.filter((observation) => observation.companyId === companyId);
  return <div className="card"><h3>Observaciones administrativas</h3>{list.length ? list.map((observation) => <p className="note" key={observation.id}><strong>{observation.author}</strong><span>{formatDate(observation.date)}</span>{observation.text}</p>) : <p className="muted">Sin observaciones nuevas.</p>}<button className="secondary">Agregar observación</button></div>;
}

function AllObservations() {
  return <div className="card"><h3>Observaciones institucionales</h3>{observations.map((observation) => <p className="note" key={observation.id}><strong>{companies.find((company) => company.id === observation.companyId)?.name}</strong><span>{formatDate(observation.date)} - {observation.author}</span>{observation.text}</p>)}</div>;
}

function ProfileCard({ company, result }: { company: CompanyProfile; result: DiagnosticResult | null }) {
  return <div className="card profile"><h3>Perfil empresa</h3>{[["Nombre", company.name], ["Folio", getCompanyFolio(company)], ["Sector", company.sector], ["Ciudad", company.city], ["Estado", company.state], ["Representante", company.representative], ["Correo", company.email], ["Teléfono", company.phone], ["Registro", formatDate(company.registeredAt)], ["Seguimiento", company.followUpStatus], ["Madurez", result?.maturity.title ?? "Sin diagnóstico"]].map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}</div>;
}

function DocumentsPanel({ companyId }: { companyId: string }) {
  return <div className="card"><h3>Expediente documental</h3><div className="document-grid">{documents.filter((document) => document.companyId === companyId).map((document) => <div className="document" key={document.id}><FileText size={20} /><strong>{document.name}</strong><Badge tone={document.status === "Validado" ? "verde" : document.status === "Observado" ? "naranja" : "amarillo"}>{document.status}</Badge><small>{document.observation ?? "Historial documental disponible para validación administrativa."}</small></div>)}</div></div>;
}

function ActivityPanel({ companyId }: { companyId: string }) {
  return <div className="card"><h3>Bitácora de actividades</h3>{activityLog.filter((log) => log.companyId === companyId).map((log) => <p className="note" key={log.id}><strong>{log.event}</strong><span>{log.date} - {log.actor}</span></p>)}</div>;
}

function DiagnosticsPanel() {
  return <div className="card"><h3>Diagnósticos</h3>{diagnostics.map((diagnostic) => <p className="note" key={diagnostic.id}><strong>{diagnostic.id} - {companies.find((company) => company.id === diagnostic.companyId)?.name}</strong><span>{diagnostic.status}{diagnostic.result ? ` - ${diagnostic.result.percentage}%` : ""}</span></p>)}</div>;
}

function ReportsPanel({ onPdf }: { onPdf: () => void }) {
  const reportItems = [
    ["Reporte por empresa", "Resultado, hallazgos, recomendaciones y expediente."],
    ["Reporte mensual agregado", "Indicadores globales para comité directivo."],
    ["Reporte por sector", "Comparativo de cumplimiento por actividad económica."],
    ["Reporte de brechas corporativas", "Riesgos frecuentes y módulos con menor calificación."],
    ["Empresas interesadas en asesoría", "Listado priorizado para seguimiento institucional."],
  ];
  return (
    <div className="card prepared">
      <Download size={34} />
      <h2>Reportes institucionales</h2>
      <p>Estructura preparada para generar reportes PDF por empresa, reporte agregado mensual e indicadores por sector.</p>
      <div className="report-grid">
        {reportItems.map(([title, description]) => (
          <button className="report-action" key={title} onClick={onPdf}>
            <FileText size={20} />
            <strong>{title}</strong>
            <span>{description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfigPanel() {
  const configSections = [
    ["Roles y permisos", "Empresa, administrador COPARMEX, revisor / asesor y superadmin.", <LockKeyhole size={20} />],
    ["Parámetros del índice", "Pesos, criterios de puntuación y reglas de clasificación.", <BarChart3 size={20} />],
    ["Catálogo de módulos", "Constitución, gobierno corporativo, libros, representación y continuidad.", <ClipboardList size={20} />],
    ["Niveles de madurez", "Rangos, semáforo corporativo y mensajes institucionales.", <ShieldCheck size={20} />],
    ["Aviso de privacidad y consentimiento", "Uso de información, confidencialidad y datos agregados.", <FileText size={20} />],
    ["Seguridad y bitácora", "Control de accesos, eventos y trazabilidad administrativa.", <CheckCircle2 size={20} />],
  ];
  return (
    <div className="card">
      <h3>Configuración institucional</h3>
      <div className="config-grid">
        {configSections.map(([title, description, icon]) => (
          <div className="config-item" key={String(title)}>
            {icon}
            <strong>{title}</strong>
            <span>{description}</span>
          </div>
        ))}
      </div>
      <h3 className="subsection-heading">Roles activos</h3>
      <div className="role-grid">{roles.map((role) => <div className="role" key={role.role}><LockKeyhole size={20} /><strong>{role.role}</strong><span>{role.description}</span></div>)}</div>
      <div className="notice"><ShieldCheck size={18} /> Se contempla aviso de privacidad, consentimiento para uso de datos, confidencialidad empresarial y estadística agregada.</div>
    </div>
  );
}

export default App;
