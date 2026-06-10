export type ImportRowStatus = "Válida" | "Advertencia" | "Error" | "Posible duplicada";
export type DuplicateMode = "omit" | "update" | "import";

export type CompanyImportRow = {
  rowNumber: number;
  consecutivoImportacion: string;
  numeroSocio: string;
  nombreEmpresa: string;
  representante: string;
  correo: string;
  rfc: string;
  numeroEmpleados: number | null;
  tamanoEmpresa: string | null;
  tamanoEmpresaFuente: "estimada_por_empleados" | null;
  status: ImportRowStatus;
  messages: string[];
  duplicateCompanyId?: string;
};

const normalizeLookup = (value: unknown) =>
  String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("es-MX")
    .replace(/[^A-Z0-9Ñ&]/g, "");

const normalizeHeader = (value: unknown) =>
  String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("es-MX")
    .replace(/[.\s_-]+/g, "");

const getValue = (row: Record<string, unknown>, acceptedHeaders: string[]) => {
  const normalizedHeaders = acceptedHeaders.map(normalizeHeader);
  const key = Object.keys(row).find((candidate) => normalizedHeaders.includes(normalizeHeader(candidate)));
  return key ? row[key] : "";
};

export const estimateCompanySize = (employees: number | null) => {
  if (employees === null) return null;
  if (employees <= 10) return "Micro";
  if (employees <= 50) return "Pequeña";
  if (employees <= 100) return "Mediana";
  return "Grande";
};

const findDuplicate = (row: CompanyImportRow, existingCompanies: Record<string, unknown>[]) =>
  existingCompanies.find((company) => {
    const existingPartnerNumber = normalizeLookup(company.numeroSocio ?? company.folio ?? company.id);
    const existingRfc = normalizeLookup(company.rfc);
    const existingEmail = String(company.correo ?? company.email ?? "").trim().toLowerCase();
    const existingName = normalizeLookup(company.nombreEmpresa ?? company.name);
    return Boolean(
      (row.numeroSocio && existingPartnerNumber === normalizeLookup(row.numeroSocio)) ||
      (row.rfc && existingRfc === normalizeLookup(row.rfc)) ||
      (row.correo && existingEmail === row.correo) ||
      (row.nombreEmpresa && existingName === normalizeLookup(row.nombreEmpresa)),
    );
  });

export async function parseCompanyImportFile(buffer: ArrayBuffer, existingCompanies: Record<string, unknown>[]) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array", cellStyles: false, cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("El archivo no contiene una hoja con información.");

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    blankrows: false,
    raw: false,
  });

  const rows = rawRows
    .filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""))
    .map((raw, index): CompanyImportRow => {
      const employeeRaw = String(getValue(raw, ["N. EMPLEADOS", "N EMPLEADOS", "NUMERO EMPLEADOS", "NÚMERO EMPLEADOS"])).trim();
      const parsedEmployees = employeeRaw === "" ? null : Number(employeeRaw.replace(/,/g, ""));
      const validEmployees = parsedEmployees !== null && Number.isFinite(parsedEmployees) && parsedEmployees >= 0;
      const numeroEmpleados = employeeRaw === "" ? null : validEmployees ? Math.trunc(parsedEmployees) : null;
      const row: CompanyImportRow = {
        rowNumber: index + 2,
        consecutivoImportacion: String(getValue(raw, ["consec", "consecutivo"])).trim(),
        numeroSocio: String(getValue(raw, ["NO. SOC", "NO SOC", "NUMERO SOCIO", "NÚMERO SOCIO"])).trim().toLocaleUpperCase("es-MX"),
        nombreEmpresa: String(getValue(raw, ["EMPRESA", "NOMBRE EMPRESA"])).trim().toLocaleUpperCase("es-MX"),
        representante: String(getValue(raw, ["SOCIO", "REPRESENTANTE"])).trim().toLocaleUpperCase("es-MX"),
        correo: String(getValue(raw, ["CORREOS", "CORREO", "EMAIL"])).trim().toLowerCase(),
        rfc: String(getValue(raw, ["RFC"])).trim().toLocaleUpperCase("es-MX"),
        numeroEmpleados,
        tamanoEmpresa: estimateCompanySize(numeroEmpleados),
        tamanoEmpresaFuente: numeroEmpleados === null ? null : "estimada_por_empleados",
        status: "Válida",
        messages: [],
      };

      if (!row.nombreEmpresa) {
        row.status = "Error";
        row.messages.push("Fila sin nombre de empresa");
      }
      if (!row.correo) {
        row.status = "Error";
        row.messages.push("Sin correo para acceso");
      }
      if (employeeRaw !== "" && !validEmployees) {
        row.status = row.status === "Error" ? "Error" : "Advertencia";
        row.messages.push("Número de empleados no válido");
      }

      const duplicate = findDuplicate(row, existingCompanies);
      if (duplicate && row.status !== "Error") {
        row.status = "Posible duplicada";
        row.messages.push("Posible empresa duplicada");
        row.duplicateCompanyId = String(duplicate.id ?? "");
      }
      return row;
    });

  const seen = new Map<string, CompanyImportRow>();
  rows.forEach((row) => {
    if (row.status === "Error") return;
    const keys = [
      row.numeroSocio && `partner:${normalizeLookup(row.numeroSocio)}`,
      row.rfc && `rfc:${normalizeLookup(row.rfc)}`,
      row.correo && `email:${row.correo}`,
      row.nombreEmpresa && `name:${normalizeLookup(row.nombreEmpresa)}`,
    ].filter(Boolean) as string[];
    const repeated = keys.some((key) => seen.has(key));
    if (repeated) {
      row.status = "Posible duplicada";
      if (!row.messages.includes("Posible empresa duplicada dentro del archivo")) row.messages.push("Posible empresa duplicada dentro del archivo");
    }
    keys.forEach((key) => {
      if (!seen.has(key)) seen.set(key, row);
    });
  });

  return rows;
}
