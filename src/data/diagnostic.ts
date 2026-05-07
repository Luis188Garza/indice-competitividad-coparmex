import { DiagnosticModule, Question } from "../types";

export const modules: DiagnosticModule[] = [
  { id: "constitucion", title: "Constitución y estatutos sociales", description: "Formalidad societaria, estatutos vigentes y estructura legal base." },
  { id: "gobierno", title: "Gobierno corporativo", description: "Asambleas, acuerdos, reglas de decisión y mecanismos de control." },
  { id: "libros", title: "Libros corporativos", description: "Libros societarios, registros y asientos actualizados." },
  { id: "representacion", title: "Representación legal", description: "Vigencia, alcance y claridad de poderes notariales." },
  { id: "contratos", title: "Documentación contractual", description: "Contratos clave, expedientes y obligaciones comerciales." },
  { id: "cumplimiento", title: "Cumplimiento regulatorio", description: "Obligaciones, avisos, beneficiario controlador y controles básicos." },
  { id: "continuidad", title: "Continuidad empresarial", description: "Procesos, responsables y continuidad operativa ante cambios o riesgos." },
];

const options7 = [
  { label: "Sí", value: 7 },
  { label: "Parcial", value: 3.5 },
  { label: "No", value: 0 },
];

const options8 = [
  { label: "Sí", value: 8 },
  { label: "Parcial", value: 4 },
  { label: "No", value: 0 },
];

export const questions: Question[] = [
  { id: "CE01", moduleId: "constitucion", text: "La empresa cuenta con acta constitutiva localizada, completa y disponible para consulta institucional.", maxWeight: 7, options: options7, recommendation: "Integrar expediente societario con acta constitutiva y reformas vigentes." },
  { id: "CE02", moduleId: "constitucion", text: "Los estatutos sociales reflejan la operación actual, socios, objeto y reglas de administración.", maxWeight: 7, options: options7, recommendation: "Revisar estatutos y actualizar reglas societarias cuando corresponda." },
  { id: "GC01", moduleId: "gobierno", text: "La empresa cuenta con actas de asamblea actualizadas y debidamente firmadas.", maxWeight: 7, options: options7, recommendation: "Regularizar actas de asamblea y documentar acuerdos entre socios." },
  { id: "GC02", moduleId: "gobierno", text: "Existen mecanismos claros para toma de decisiones, autorizaciones y seguimiento de acuerdos.", maxWeight: 7, options: options7, recommendation: "Establecer mecanismos básicos de gobierno corporativo y toma de decisiones." },
  { id: "LC01", moduleId: "libros", text: "Los libros corporativos se encuentran actualizados con asientos societarios relevantes.", maxWeight: 7, options: options7, recommendation: "Actualizar libros corporativos y revisar asientos societarios pendientes." },
  { id: "LC02", moduleId: "libros", text: "La empresa conserva evidencia documental de cambios de socios, capital y administración.", maxWeight: 7, options: options7, recommendation: "Ordenar soporte documental de movimientos corporativos relevantes." },
  { id: "RL01", moduleId: "representacion", text: "Los poderes notariales del representante legal se encuentran vigentes y localizados.", maxWeight: 7, options: options7, recommendation: "Revisar vigencia de poderes notariales y facultades del representante legal." },
  { id: "RL02", moduleId: "representacion", text: "Las facultades otorgadas cubren actos de administración, pleitos, cobranzas y dominio cuando aplica.", maxWeight: 7, options: options7, recommendation: "Validar que el poder cubra las facultades necesarias para la operación." },
  { id: "DC01", moduleId: "contratos", text: "La empresa mantiene contratos actualizados con clientes, proveedores y colaboradores clave.", maxWeight: 7, options: options7, recommendation: "Actualizar contratos clave y documentar obligaciones comerciales." },
  { id: "DC02", moduleId: "contratos", text: "Existe control interno sobre vencimientos, obligaciones y expedientes contractuales.", maxWeight: 7, options: options7, recommendation: "Implementar control de vencimientos y expedientes contractuales." },
  { id: "CR01", moduleId: "cumplimiento", text: "La empresa identifica obligaciones regulatorias, fiscales y corporativas recurrentes.", maxWeight: 7, options: options7, recommendation: "Mapear obligaciones regulatorias y responsables internos de cumplimiento." },
  { id: "CR02", moduleId: "cumplimiento", text: "Se cuenta con información actualizada sobre beneficiario controlador y controles de confidencialidad.", maxWeight: 7, options: options7, recommendation: "Actualizar información de beneficiario controlador y avisos internos." },
  { id: "CO01", moduleId: "continuidad", text: "La empresa tiene responsables definidos para procesos corporativos, legales y administrativos clave.", maxWeight: 8, options: options8, recommendation: "Definir responsables internos para procesos clave." },
  { id: "CO02", moduleId: "continuidad", text: "Existe un plan básico de continuidad ante cambios de socios, administradores o eventos críticos.", maxWeight: 8, options: options8, recommendation: "Establecer plan básico de continuidad empresarial." },
];
