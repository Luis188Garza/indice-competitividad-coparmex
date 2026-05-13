import { diagnosticICE } from "../data/diagnosticICE";
import { DiagnosticResult, MaturityLevel, SelectedDiagnosticOption } from "../types";

type AnswerValue = number | SelectedDiagnosticOption;

const modules = diagnosticICE.modules.slice().sort((a, b) => a.order - b.order);

export const maturityLevels: MaturityLevel[] = diagnosticICE.levels.map((level) => ({
  level: level.level,
  title: level.title,
  range: `${level.min}-${level.max}`,
  trafficLight: level.trafficLight,
  message: level.interpretation,
}));

function answerPoints(answer: AnswerValue | undefined) {
  if (answer === undefined) return 0;
  return typeof answer === "number" ? answer : answer.points;
}

export function classifyMaturity(percentage: number): MaturityLevel {
  const level = diagnosticICE.levels.find((item) => percentage >= item.min && percentage <= item.max) ?? diagnosticICE.levels[diagnosticICE.levels.length - 1];
  return {
    level: level.level,
    title: level.title,
    range: `${level.min}-${level.max}`,
    trafficLight: level.trafficLight,
    message: level.interpretation,
  };
}

export function calculateDiagnostic(answers: Record<string, AnswerValue>): DiagnosticResult {
  const maxScore = diagnosticICE.totalPoints;
  const moduleScores = modules.map((module) => {
    const score = module.questions.reduce((sum, question) => sum + answerPoints(answers[question.id]), 0);
    return {
      moduleId: module.id,
      title: module.title,
      score,
      maxScore: module.maxPoints,
      percentage: Math.round((score / module.maxPoints) * 100),
    };
  });
  const totalScore = moduleScores.reduce((sum, module) => sum + module.score, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);
  const lowModules = moduleScores.filter((module) => module.percentage < 70).sort((a, b) => a.percentage - b.percentage);
  const findings = lowModules.length
    ? lowModules.slice(0, 4).map((module) => `${module.title}: ${module.percentage}% de cumplimiento.`)
    : ["La empresa mantiene indicadores corporativos consistentes en todos los módulos evaluados."];
  const recommendations = lowModules.length
    ? lowModules.slice(0, 5).map((module) => `Priorizar revisión y fortalecimiento del módulo: ${module.title}.`)
    : ["Mantener la actualización documental y el seguimiento institucional periódico."];

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
