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
import { useEffect, useMemo, useState } from "react";
import { diagnosticICE } from "./data/diagnosticICE";
import { activityLog, companies, diagnostics, documents, observations, roles } from "./data/mockData";
import { CompanyProfile, DiagnosticResult, SelectedDiagnosticOption } from "./types";
import { saveDiagnosticResponse } from "./services/diagnosticResponsesService";
import { calculateDiagnostic, trafficLabel } from "./utils/scoring";

type View = "landing" | "about" | "login" | "loginEmpresa" | "loginAdmin" | "register" | "questionnaire" | "result" | "company" | "admin" | "stats" | "detail";
type CompanyTab = "dashboard" | "autodiagnostico" | "resultado" | "recomendaciones" | "observaciones" | "perfil" | "documentacion";
type AdminTab = "panel" | "empresas" | "diagnosticos" | "estadisticas" | "observaciones" | "reportes" | "configuracion";
type Session = { isAuthenticated: boolean; role: "empresa" | "admin" | null; companyId?: string; adminName?: string };
type AnswerState = Record<string, SelectedDiagnosticOption>;

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

function App() {
  const [view, setView] = useState<View>("landing");
  const [companyTab, setCompanyTab] = useState<CompanyTab>("dashboard");
  const [adminTab, setAdminTab] = useState<AdminTab>("panel");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(companies[0].id);
  const [session, setSession] = useState<Session>({ isAuthenticated: false, role: null });
  const [profile, setProfile] = useState<CompanyProfile>(initialCompany);
  const [currentModule, setCurrentModule] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>(() => {
    if (typeof window === "undefined") return {};
    const saved = window.localStorage.getItem("ice-diagnostic-answers");
    return saved ? JSON.parse(saved) as AnswerState : {};
  });
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [saveState, setSaveState] = useState<{ loading: boolean; error: string; success: string }>({ loading: false, error: "", success: "" });

  const completedDiagnostics = diagnostics.filter((diagnostic) => diagnostic.status === "Completo" && diagnostic.result);
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? companies[0];
  const selectedDiagnostic = diagnostics.find((diagnostic) => diagnostic.companyId === selectedCompany.id && diagnostic.result);
  const showcaseDiagnostic = selectedDiagnostic?.result ?? completedDiagnostics[0].result!;
  const sessionCompany = companies.find((company) => company.id === session.companyId);
  const activeCompany = sessionCompany ?? (profile.name ? profile : companies[0]);
  const activeDiagnostic = diagnostics.find((diagnostic) => diagnostic.companyId === activeCompany.id && diagnostic.result);
  const activeResult = result ?? activeDiagnostic?.result ?? showcaseDiagnostic;
  const currentQuestions = diagnosticModules[currentModule].questions.slice().sort((a, b) => a.order - b.order);
  const answeredQuestions = diagnosticQuestions.filter((question) => answers[question.id] !== undefined).length;
  const progress = Math.round((answeredQuestions / diagnosticQuestions.length) * 100);

  useEffect(() => {
    window.localStorage.setItem("ice-diagnostic-answers", JSON.stringify(answers));
  }, [answers]);

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
        companyId: activeCompany.id || session.companyId || "TEMP-COMPANY",
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
      setSaveState({ loading: false, error: "", success: `Diagnóstico guardado correctamente. Folio de respuesta: ${responseId}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible guardar el diagnóstico en Firestore.";
      setSaveState({ loading: false, error: message, success: "" });
    }
  };

  const simulatePdf = () => {
    window.print();
  };

  const logout = () => {
    setSession({ isAuthenticated: false, role: null });
    setView("landing");
    setCompanyTab("dashboard");
    setAdminTab("panel");
  };

  const loginCompany = (folio: string, password: string) => {
    const company = companies.find((item) => item.id.toLowerCase() === folio.trim().toLowerCase());
    if (company && password === "demo123") {
      setSession({ isAuthenticated: true, role: "empresa", companyId: company.id });
      setSelectedCompanyId(company.id);
      setView("company");
      return true;
    }
    return false;
  };

  const loginAdmin = (user: string, password: string) => {
    if (user.trim().toLowerCase() === "admin@coparmexnld.org.mx" && password === "admin123") {
      setSession({ isAuthenticated: true, role: "admin", adminName: "Administrador COPARMEX" });
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
        {view === "landing" && <Landing onPortal={() => setView("login")} />}
        {view === "about" && <AboutIndex />}
        {view === "login" && <AccessHub onCompany={() => setView("loginEmpresa")} onAdmin={() => setView("loginAdmin")} />}
        {view === "loginEmpresa" && <CompanyLogin onLogin={loginCompany} />}
        {view === "loginAdmin" && <AdminLogin onLogin={loginAdmin} />}
        {view === "register" && <Register profile={profile} setProfile={setProfile} onNext={() => setView("questionnaire")} />}
        {view === "questionnaire" && (
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
        {view === "result" && result && (
          <ResultScreen company={activeCompany} result={result} saveState={saveState} onPdf={simulatePdf} onPortal={() => { setSession({ isAuthenticated: true, role: "empresa", companyId: session.companyId }); setView("company"); }} />
        )}
        {view === "company" && session.role === "empresa" && (
          <CompanyPortal
            tab={companyTab}
            setTab={setCompanyTab}
            company={activeCompany}
            result={activeResult}
            onStart={() => setView("questionnaire")}
            onPdf={simulatePdf}
          />
        )}
        {view === "admin" && session.role === "admin" && (
          <AdminPortal
            tab={adminTab}
            setTab={setAdminTab}
            stats={stats}
            selectedCompanyId={selectedCompanyId}
            setSelectedCompanyId={setSelectedCompanyId}
            setView={setView}
            onPdf={simulatePdf}
          />
        )}
        {view === "stats" && session.role === "admin" && <RegionalStats stats={stats} />}
        {view === "detail" && session.role === "admin" && <CompanyDetail company={selectedCompany} result={showcaseDiagnostic} onBack={() => setView("admin")} onPdf={simulatePdf} />}
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
  const adminTabs: AdminTab[] = ["panel", "empresas", "diagnosticos", "estadisticas", "observaciones", "reportes", "configuracion"];
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
        <div className="drawer-session"><strong>{props.activeCompany.name}</strong><span>Folio: {props.activeCompany.id}</span></div>
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
          <em>Folio: {activeCompany.id}</em>
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

function Landing({ onPortal }: { onPortal: () => void }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">Herramienta institucional COPARMEX Nuevo Laredo</span>
        <h1>Índice de Competitividad Empresarial</h1>
        <p>Diagnóstico de madurez corporativa para empresas afiliadas a COPARMEX Nuevo Laredo.</p>
        <div className="hero-actions">
          <button className="primary" onClick={onPortal}>Iniciar sesión</button>
          <button className="secondary" onClick={onPortal}>Acceso privado</button>
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

function CompanyLogin({ onLogin }: { onLogin: (folio: string, password: string) => boolean }) {
  const [folio, setFolio] = useState("COP-001");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  return (
    <section className="page narrow">
      <SectionTitle title="Acceso empresa" subtitle="Utiliza el folio asignado por COPARMEX Nuevo Laredo." />
      <div className="login-card">
        <Field label="Folio de empresa" value={folio} onChange={setFolio} />
        <PasswordField label="Contraseña" value={password} onChange={setPassword} />
        {error && <p className="form-error">{error}</p>}
        <button className="primary" onClick={() => onLogin(folio, password) || setError("Folio o contraseña incorrectos.")}>Ingresar al portal empresa</button>
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

function CompanyPortal({ tab, setTab, company, result, onStart, onPdf }: { tab: CompanyTab; setTab: (tab: CompanyTab) => void; company: CompanyProfile; result: DiagnosticResult; onStart: () => void; onPdf: () => void }) {
  const tabs: CompanyTab[] = ["dashboard", "autodiagnostico", "resultado", "recomendaciones", "observaciones", "perfil", "documentacion"];
  return (
    <section className="portal">
      <Sidebar title="Portal empresa" items={tabs} active={tab} onSelect={setTab} />
      <div className="portal-content">
        {tab === "dashboard" && <CompanyDashboard company={company} result={result} onStart={onStart} />}
        {tab === "autodiagnostico" && <PrepPanel onStart={onStart} />}
        {tab === "resultado" && <ResultScreen company={company} result={result} saveState={{ loading: false, error: "", success: "" }} onPdf={onPdf} onPortal={() => setTab("dashboard")} />}
        {tab === "recomendaciones" && <InsightList title="Plan de acción recomendado" items={result.recommendations} />}
        {tab === "observaciones" && <ObservationList companyId={company.id} />}
        {tab === "perfil" && <ProfileCard company={company} result={result} />}
        {tab === "documentacion" && <DocumentsPanel companyId={company.id} />}
      </div>
    </section>
  );
}

function AdminPortal(props: { tab: AdminTab; setTab: (tab: AdminTab) => void; stats: any; selectedCompanyId: string; setSelectedCompanyId: (id: string) => void; setView: (view: View) => void; onPdf: () => void }) {
  const tabs: AdminTab[] = ["panel", "empresas", "diagnosticos", "estadisticas", "observaciones", "reportes", "configuracion"];
  return (
    <section className="portal">
      <Sidebar title="Panel administrativo" items={tabs} active={props.tab} onSelect={props.setTab} />
      <div className="portal-content">
        {props.tab === "panel" && <AdminDashboard stats={props.stats} />}
        {props.tab === "empresas" && <CompaniesTable setSelectedCompanyId={props.setSelectedCompanyId} setView={props.setView} onPdf={props.onPdf} />}
        {props.tab === "diagnosticos" && <DiagnosticsPanel />}
        {props.tab === "estadisticas" && <RegionalStats stats={props.stats} compact />}
        {props.tab === "observaciones" && <AllObservations />}
        {props.tab === "reportes" && <ReportsPanel onPdf={props.onPdf} />}
        {props.tab === "configuracion" && <ConfigPanel />}
      </div>
    </section>
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

function CompanyDashboard({ company, result, onStart }: { company: CompanyProfile; result: DiagnosticResult; onStart: () => void }) {
  return (
    <>
      <ResultHeader company={company} result={result} compact />
      <div className="kpi-grid">
        <Kpi icon={<LayoutDashboard />} label="Folio institucional" value={company.id} />
        <Kpi icon={<BarChart3 />} label="Cumplimiento global" value={`${result.percentage}%`} />
        <Kpi icon={<ShieldCheck />} label="Semáforo" value={trafficLabel(result.maturity.trafficLight)} />
        <Kpi icon={<FileText />} label="Observaciones nuevas" value={observations.filter((obs) => obs.companyId === company.id).length} />
      </div>
      <TwoColumns left={<ModuleBars scores={result.moduleScores} />} right={<InsightList title="Acciones recomendadas" items={result.recommendations.slice(0, 4)} />} />
      <button className="primary" onClick={onStart}>Actualizar diagnóstico</button>
    </>
  );
}

function CompaniesTable({ setSelectedCompanyId, setView, onPdf }: { setSelectedCompanyId: (id: string) => void; setView: (view: View) => void; onPdf: () => void }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const companyRows = companies.map((company) => ({
    company,
    diagnostic: diagnostics.find((item) => item.companyId === company.id && item.result),
    observations: observations.filter((observation) => observation.companyId === company.id).length,
  }));
  const openDetail = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setView("detail");
    setOpenMenu(null);
  };
  const downloadReport = () => {
    setOpenMenu(null);
    onPdf();
  };

  return (
    <>
      <SectionTitle title="Empresas" subtitle="Listado operativo para seguimiento institucional, observaciones y reportes." />
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
            <span>{company.id}</span>
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
                onDetail={openDetail}
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
              <span>{company.id}</span>
              <ActionMenu
                companyId={company.id}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
                onDetail={openDetail}
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

function ActionMenu({ companyId, openMenu, setOpenMenu, onDetail, onReport }: { companyId: string; openMenu: string | null; setOpenMenu: (id: string | null) => void; onDetail: (companyId: string) => void; onReport: () => void }) {
  const isOpen = openMenu === companyId;
  return (
    <div className="action-menu-wrap">
      <button className="kebab-action" aria-label="Más acciones" title="Más acciones" onClick={() => setOpenMenu(isOpen ? null : companyId)}>⋯</button>
      {isOpen && (
        <div className="action-menu">
          <button onClick={() => onDetail(companyId)}><Eye size={15} /> Ver detalle</button>
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
  const labels: Record<string, string> = { autodiagnostico: "Autodiagnóstico", documentacion: "Documentación", estadisticas: "Estadísticas", configuracion: "Configuración", diagnosticos: "Diagnósticos" };
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
        <button className="secondary">Guardar y continuar</button>
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

function ProfileCard({ company, result }: { company: CompanyProfile; result: DiagnosticResult }) {
  return <div className="card profile"><h3>Perfil empresa</h3>{[["Nombre", company.name], ["Folio", company.id], ["Sector", company.sector], ["Ciudad", company.city], ["Estado", company.state], ["Representante", company.representative], ["Correo", company.email], ["Teléfono", company.phone], ["Registro", formatDate(company.registeredAt)], ["Seguimiento", company.followUpStatus], ["Madurez", result.maturity.title]].map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}</div>;
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
