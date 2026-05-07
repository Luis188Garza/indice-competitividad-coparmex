import { modules, questions } from "../data/diagnostic";
import { DiagnosticResult, MaturityLevel } from "../types";

export const maturityLevels: MaturityLevel[] = [
  { level: 4, title: "Empresa institucionalizada", range: "85-100", trafficLight: "verde", message: "La empresa presenta una estructura corporativa sólida, documentada y apta para procesos de crecimiento, financiamiento o inversión." },
  { level: 3, title: "Cumplimiento sólido", range: "70-84", trafficLight: "verde-claro", message: "La empresa cuenta con bases corporativas funcionales y requiere ajustes puntuales para fortalecer su institucionalización." },
  { level: 2, title: "Cumplimiento parcial", range: "50-69", trafficLight: "amarillo", message: "La empresa presenta una estructura corporativa funcional, pero existen áreas de riesgo relacionadas con documentación, gobierno societario o continuidad." },
  { level: 1, title: "Riesgo corporativo", range: "30-49", trafficLight: "naranja", message: "La empresa requiere atención prioritaria para reducir riesgos jurídicos, operativos y de seguimiento institucional." },
  { level: 0, title: "Alto riesgo jurídico", range: "0-29", trafficLight: "rojo", message: "La empresa presenta vulnerabilidades jurídicas relevantes que podrían afectar su acceso a financiamiento o generar riesgos entre socios." },
];

export function classifyMaturity(percentage: number): MaturityLevel {
  if (percentage >= 85) return maturityLevels[0];
  if (percentage >= 70) return maturityLevels[1];
  if (percentage >= 50) return maturityLevels[2];
  if (percentage >= 30) return maturityLevels[3];
  return maturityLevels[4];
}

export function calculateDiagnostic(answers: Record<string, number>): DiagnosticResult {
  const maxScore = questions.reduce((sum, question) => sum + question.maxWeight, 0);
  const totalScore = questions.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0);
  const percentage = Math.round((totalScore / maxScore) * 100);
  const moduleScores = modules.map((module) => {
    const moduleQuestions = questions.filter((question) => question.moduleId === module.id);
    const score = moduleQuestions.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0);
    const moduleMax = moduleQuestions.reduce((sum, question) => sum + question.maxWeight, 0);
    return {
      moduleId: module.id,
      title: module.title,
      score,
      maxScore: moduleMax,
      percentage: Math.round((score / moduleMax) * 100),
    };
  });
  const lowModules = moduleScores.filter((module) => module.percentage < 70).sort((a, b) => a.percentage - b.percentage);
  const recommendations = questions
    .filter((question) => (answers[question.id] ?? 0) < question.maxWeight && question.recommendation)
    .map((question) => question.recommendation!)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 7);
  const findings = lowModules.length
    ? lowModules.slice(0, 4).map((module) => `${module.title}: ${module.percentage}% de cumplimiento.`)
    : ["La empresa mantiene indicadores corporativos consistentes en todos los módulos evaluados."];

  return {
    totalScore,
    maxScore,
    percentage,
    maturity: classifyMaturity(percentage),
    moduleScores,
    findings,
    recommendations,
    completedAt: new Date().toISOString(),
  };
}

export function trafficLabel(light: string) {
  return light === "verde-claro" ? "Verde claro" : light.charAt(0).toUpperCase() + light.slice(1);
}
