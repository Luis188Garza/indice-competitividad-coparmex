import { diagnosticICE } from "./diagnosticICE";
import { DiagnosticModule, Question } from "../types";

export const modules: DiagnosticModule[] = diagnosticICE.modules
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((module) => ({
    id: module.id,
    title: module.title,
    description: `${module.questions.length} preguntas. Puntaje máximo: ${module.maxPoints}.`,
  }));

export const questions: Question[] = diagnosticICE.modules
  .slice()
  .sort((a, b) => a.order - b.order)
  .flatMap((module) =>
    module.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((question) => ({
        id: question.id,
        moduleId: module.id,
        text: question.text,
        maxWeight: Math.max(...question.options.map((option) => option.points)),
        options: question.options.map((option) => ({
          label: option.label,
          value: option.points,
        })),
      })),
  );
