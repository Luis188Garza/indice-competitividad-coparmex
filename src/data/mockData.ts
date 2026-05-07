import { ActivityLog, CompanyDocument, CompanyProfile, Diagnostic, Observation } from "../types";
import { calculateDiagnostic } from "../utils/scoring";

const answerSet = (values: readonly number[]): Record<string, number> => {
  const ids = ["CE01", "CE02", "GC01", "GC02", "LC01", "LC02", "RL01", "RL02", "DC01", "DC02", "CR01", "CR02", "CO01", "CO02"];
  return Object.fromEntries(ids.map((id, index) => [id, values[index] ?? 0]));
};

export const companies: CompanyProfile[] = [
  {
    id: "COP-001",
    name: "Administración y Desarrollo Global de Nuevo Laredo S.C.",
    sector: "Administración y desarrollo empresarial",
    city: "Nuevo Laredo",
    state: "Tamaulipas",
    employees: "11-30",
    years: "6-10 años",
    email: "contacto@adglobalnld.mx",
    phone: "867 100 1100",
    representative: "Cristina Valle",
    registeredAt: "2026-04-12",
    followUpStatus: "En seguimiento",
    interestedInAdvisory: true,
  },
  {
    id: "COP-002",
    name: "CRS Legal",
    sector: "Servicios legales",
    city: "Nuevo Laredo",
    state: "Tamaulipas",
    employees: "11-30",
    years: "Más de 10 años",
    email: "contacto@crslegal.mx",
    phone: "867 210 3300",
    representative: "Rafael Salinas",
    registeredAt: "2026-04-14",
    followUpStatus: "Cerrado",
    interestedInAdvisory: false,
  },
  {
    id: "COP-003",
    name: "Onilog",
    sector: "Logística y operación",
    city: "Nuevo Laredo",
    state: "Tamaulipas",
    employees: "51-100",
    years: "6-10 años",
    email: "direccion@onilog.mx",
    phone: "867 320 4100",
    representative: "Mariana Treviño",
    registeredAt: "2026-04-16",
    followUpStatus: "Asesoría solicitada",
    interestedInAdvisory: true,
  },
  {
    id: "COP-004",
    name: "Notaría Pública 188",
    sector: "Servicios notariales",
    city: "Nuevo Laredo",
    state: "Tamaulipas",
    employees: "1-10",
    years: "Más de 10 años",
    email: "contacto@notaria188.mx",
    phone: "867 430 2200",
    representative: "Lic. titular",
    registeredAt: "2026-04-18",
    followUpStatus: "Sin iniciar",
    interestedInAdvisory: false,
  },
  {
    id: "COP-005",
    name: "Gestión y Desarrollo",
    sector: "Gestión empresarial",
    city: "Nuevo Laredo",
    state: "Tamaulipas",
    employees: "31-50",
    years: "3-5 años",
    email: "contacto@gestionydesarrollo.mx",
    phone: "867 540 7000",
    representative: "Karla Martínez",
    registeredAt: "2026-04-19",
    followUpStatus: "En seguimiento",
    interestedInAdvisory: true,
  },
];

const completeDiagnostics = [
  ["COP-001", [7, 7, 3.5, 3.5, 3.5, 3.5, 7, 7, 3.5, 3.5, 3.5, 3.5, 4, 4]], // 65%, amarillo
  ["COP-002", [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 8]], // 100%, verde
  ["COP-003", [7, 7, 7, 3.5, 3.5, 3.5, 7, 7, 7, 3.5, 3.5, 3.5, 4, 4]], // 71%, verde claro
  ["COP-004", [3.5, 3.5, 0, 0, 0, 0, 3.5, 0, 3.5, 0, 3.5, 0, 4, 0]], // 22%, rojo
  ["COP-005", [7, 3.5, 3.5, 0, 0, 0, 3.5, 3.5, 3.5, 3.5, 3.5, 2.5, 4, 0]], // 38%, naranja
] as const;

export const diagnostics: Diagnostic[] = completeDiagnostics.map(([companyId, values], index) => {
  const answers = answerSet(values);
  return { id: `DX-2026-${String(index + 1).padStart(3, "0")}`, companyId, status: "Completo", answers, result: calculateDiagnostic(answers) };
});

export const observations: Observation[] = [
  { id: "OBS-001", companyId: "COP-001", author: "Coordinación COPARMEX", date: "2026-04-20", text: "Solicita orientación para regularizar libros corporativos y controles contractuales." },
  { id: "OBS-002", companyId: "COP-003", author: "Revisor institucional", date: "2026-04-21", text: "Se recomienda priorizar gobierno corporativo y continuidad empresarial antes de iniciar expansión." },
  { id: "OBS-003", companyId: "COP-004", author: "Coordinación COPARMEX", date: "2026-04-22", text: "Pendiente confirmar actualización documental y validación de poderes." },
  { id: "OBS-004", companyId: "COP-005", author: "Revisor institucional", date: "2026-04-24", text: "Riesgo corporativo relevante en libros corporativos y continuidad operativa." },
];

export const documents: CompanyDocument[] = companies.flatMap((company) => [
  { id: `${company.id}-DOC-01`, companyId: company.id, name: "Acta constitutiva", status: company.id === "COP-004" ? "Pendiente" : "Validado", uploadedAt: "2026-04-18", validatedBy: "COPARMEX" },
  { id: `${company.id}-DOC-02`, companyId: company.id, name: "Poder notarial vigente", status: company.interestedInAdvisory ? "En revisión" : "Cargado", uploadedAt: "2026-04-19", observation: company.interestedInAdvisory ? "Verificar alcance de facultades." : undefined },
  { id: `${company.id}-DOC-03`, companyId: company.id, name: "Libros corporativos", status: company.followUpStatus === "Cerrado" ? "Validado" : "Observado", uploadedAt: "2026-04-20", observation: "Confirmar actualización de asientos societarios." },
]);

export const activityLog: ActivityLog[] = [
  { id: "LOG-001", companyId: "COP-001", event: "Empresa registrada", date: "2026-04-12 09:20", actor: "Empresa" },
  { id: "LOG-002", companyId: "COP-001", event: "Diagnóstico completado", date: "2026-04-12 09:36", actor: "Empresa" },
  { id: "LOG-003", companyId: "COP-001", event: "Empresa solicitó asesoría", date: "2026-04-12 09:42", actor: "Empresa" },
  { id: "LOG-004", companyId: "COP-003", event: "Observación creada", date: "2026-04-21 12:10", actor: "Revisor institucional" },
  { id: "LOG-005", companyId: "COP-004", event: "Resultado generado", date: "2026-04-24 16:45", actor: "Sistema institucional" },
  { id: "LOG-006", companyId: "COP-005", event: "Reporte descargado", date: "2026-04-25 11:02", actor: "Empresa" },
];

export const roles = [
  { role: "Empresa", description: "Acceso a perfil, diagnóstico, resultado, recomendaciones y expediente documental propio." },
  { role: "Administrador COPARMEX", description: "Seguimiento institucional, estadística agregada, empresas, observaciones y reportes." },
  { role: "Revisor / asesor", description: "Revisión documental, observaciones técnicas y acompañamiento a empresas." },
  { role: "Superadmin", description: "Configuración general, roles, catálogos, seguridad y parámetros del índice." },
];
