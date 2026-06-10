export type Role = "empresa" | "admin" | "revisor" | "superadmin";
export type TrafficLight = "verde" | "verde-claro" | "amarillo" | "naranja" | "rojo";
export type ComplianceLevel = "critical" | "immediate" | "opportunity" | "mature";
export type FollowUpStatus = "Sin iniciar" | "En seguimiento" | "Asesoría solicitada" | "Cerrado";
export type DocumentStatus = "Pendiente" | "Cargado" | "En revisión" | "Observado" | "Validado";

export interface CompanyProfile {
  id: string;
  name: string;
  sector: string;
  city: string;
  state: string;
  employees: string;
  years: string;
  email: string;
  phone: string;
  representative: string;
  registeredAt: string;
  followUpStatus: FollowUpStatus;
  interestedInAdvisory: boolean;
}
export interface AnswerOption {
  label: string;
  value: number;
}

export interface Question {
  id: string;
  moduleId: string;
  text: string;
  maxWeight: number;
  options: AnswerOption[];
  recommendation?: string;
}

export interface DiagnosticModule {
  id: string;
  title: string;
  description: string;
}

export interface ModuleScore {
  moduleId: string;
  title: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface MaturityLevel {
  level: number;
  title: string;
  range: string;
  trafficLight: TrafficLight;
  message: string;
}

export interface SelectedDiagnosticOption {
  label: string;
  points: number;
}

export interface DiagnosticResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  maturity: MaturityLevel;
  moduleScores: ModuleScore[];
  findings: string[];
  recommendations: string[];
  completedAt: string;
  diagnosticVersion?: string;
  scoringVersion?: string;
}

export interface Diagnostic {
  id: string;
  companyId: string;
  status: "Completo" | "Pendiente";
  answers: Record<string, number | SelectedDiagnosticOption>;
  result?: DiagnosticResult;
}

export interface Observation {
  id: string;
  companyId: string;
  author: string;
  date: string;
  text: string;
}

export interface CompanyDocument {
  id: string;
  companyId: string;
  name: string;
  status: DocumentStatus;
  uploadedAt?: string;
  observation?: string;
  validatedBy?: string;
}

export interface ActivityLog {
  id: string;
  companyId: string;
  event: string;
  date: string;
  actor: string;
}
