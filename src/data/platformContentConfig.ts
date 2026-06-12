export type HelpContent = {
  id: string;
  title: string;
  shortText: string;
  longText?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type ComplianceLevel = "critical" | "immediate" | "opportunity" | "mature";

export type TrafficLightHelp = {
  key: ComplianceLevel;
  label: string;
  color: "red" | "orange" | "yellow" | "green";
  min: number;
  max: number;
  shortText: string;
  longText: string;
};

export type PlatformContentConfig = {
  generalTexts: Record<string, string>;
  trafficLight: TrafficLightHelp[];
  sectionHelps: HelpContent[];
  questionHelps: HelpContent[];
  reviewRequest: Record<string, string>;
  regionalIndicator: Record<string, string>;
};

export const platformContentConfig: PlatformContentConfig = {
  generalTexts: {
    welcomeTitle: "Índice de Competitividad Empresarial",
    welcomeIntro:
      "El Índice de Competitividad Empresarial permite evaluar la madurez, cumplimiento y organización documental de una empresa afiliada a COPARMEX mediante un autodiagnóstico estructurado.",
    competitiveness:
      "Se llama competitividad porque una empresa mejor organizada, documentada y alineada con buenas prácticas tiene mayor capacidad para crecer, acceder a oportunidades, reducir riesgos, atraer inversión, cumplir con autoridades y fortalecer su permanencia en el mercado.",
    preparation:
      "Para responder el autodiagnóstico se recomienda tener a la mano información corporativa, contratos, documentos laborales, fiscales, administrativos y cualquier documentación relacionada con la operación de la empresa.",
    outcome:
      "Al finalizar, la plataforma mostrará un semáforo de cumplimiento, resultados por secciones, hallazgos relevantes, riesgos detectados y acciones sugeridas para mejorar la madurez empresarial.",
    about:
      "El Índice de Competitividad Empresarial permite evaluar la madurez corporativa y contractual, identificar brechas de cumplimiento y detectar oportunidades de mejora institucional para empresas afiliadas a COPARMEX. Mediante un autodiagnóstico, la empresa podrá conocer su nivel de cumplimiento global, revisar resultados por secciones, visualizar recomendaciones puntuales y detectar acciones sugeridas para fortalecer su operación.",
    coparmexSupport:
      "COPARMEX podrá vincularte con especialistas, aliados o servicios de apoyo para atender las áreas de oportunidad detectadas en tu autodiagnóstico.",
    nextStepTitle: "Sustento normativo",
  },
  trafficLight: [
    {
      key: "mature",
      label: "Madura",
      color: "green",
      min: 85,
      max: 100,
      shortText: "Se activa con cumplimiento de 85% a 100%. Indica una empresa madura.",
      longText: "La empresa muestra un nivel alto de madurez, organización documental y cumplimiento.",
    },
    {
      key: "opportunity",
      label: "Área de oportunidad",
      color: "yellow",
      min: 70,
      max: 84,
      shortText: "Se activa con cumplimiento de 70% a 84%. Indica área de oportunidad.",
      longText: "La empresa cuenta con avances relevantes, pero todavía existen aspectos que deben fortalecerse.",
    },
    {
      key: "immediate",
      label: "Atención inmediata",
      color: "orange",
      min: 50,
      max: 69,
      shortText: "Se activa con cumplimiento de 50% a 69%. Indica atención inmediata.",
      longText: "Existen secciones importantes que requieren atención prioritaria para reducir riesgos.",
    },
    {
      key: "critical",
      label: "Riesgo crítico",
      color: "red",
      min: 0,
      max: 49,
      shortText: "Se activa con cumplimiento de 0% a 49%. Indica riesgo crítico.",
      longText: "La empresa presenta brechas relevantes de cumplimiento, organización documental o control.",
    },
  ],
  sectionHelps: [
    {
      id: "continuidad",
      title: "Continuidad y legado empresarial",
      shortText: "Evalúa cómo se preservará la operación, propiedad y toma de decisiones ante cambios relevantes.",
    },
  ],
  questionHelps: [
    {
      id: "CE01",
      title: "Acta constitutiva",
      shortText: "Es el instrumento legal mediante el cual se crea formalmente una empresa.",
      longText: "Contiene la razón social, objeto, domicilio, capital, socios o accionistas, administración y reglas esenciales de la empresa.",
    },
    {
      id: "CE02",
      title: "Estatutos sociales",
      shortText: "Son las reglas internas que determinan cómo se organiza y opera la sociedad.",
    },
    {
      id: "GC02",
      title: "Administrador o consejo de administración",
      shortText: "Son las personas u órganos formalmente responsables de dirigir y representar la empresa.",
    },
    {
      id: "LC01",
      title: "Libro de actas",
      shortText: "Conserva evidencia ordenada de las decisiones tomadas por socios o accionistas.",
    },
    {
      id: "LC02",
      title: "Libro de socios o accionistas",
      shortText: "Permite acreditar quiénes integran la sociedad y cuál es su participación.",
    },
    {
      id: "RL01",
      title: "Poderes vigentes",
      shortText: "Acreditan las facultades de quienes actúan en nombre de la empresa.",
    },
    {
      id: "CR01",
      title: "Cumplimiento regulatorio",
      shortText: "Comprende la documentación y controles que permiten acreditar las obligaciones aplicables de la empresa, con especial atención al marco normativo correspondiente.",
    },
    {
      id: "CO01",
      title: "Continuidad y legado empresarial",
      shortText: "Incluye reglas y mecanismos para sostener la empresa y su toma de decisiones en el tiempo.",
    },
  ],
  reviewRequest: {
    title: "Revisión documental",
    description: "Permite solicitar una valoración más profunda de la documentación relacionada con el autodiagnóstico.",
  },
  regionalIndicator: {
    description:
      "Este indicador muestra de forma agregada el nivel de madurez de las empresas participantes en la región, sin revelar información individual de ninguna empresa.",
  },
};

export function getComplianceLevel(percentage: number) {
  return platformContentConfig.trafficLight.find((level) => percentage >= level.min && percentage <= level.max)
    ?? platformContentConfig.trafficLight[platformContentConfig.trafficLight.length - 1];
}
