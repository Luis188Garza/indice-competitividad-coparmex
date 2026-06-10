import { TrafficLight } from "../types";

export const diagnosticICE = {
  id: "ice-coparmex-nld",
  title: "Índice de Competitividad Empresarial",
  subtitle: "Autodiagnóstico de madurez empresarial",
  totalPoints: 100,
  levels: [
    {
      level: 4,
      title: "Madura",
      min: 85,
      max: 100,
      trafficLight: "verde" as TrafficLight,
      interpretation: "La empresa presenta una estructura sólida, documentada y apta para procesos de crecimiento, financiamiento o inversión.",
    },
    {
      level: 3,
      title: "Área de oportunidad",
      min: 70,
      max: 84,
      trafficLight: "amarillo" as TrafficLight,
      interpretation: "La empresa cuenta con avances relevantes, pero todavía existen aspectos que deben fortalecerse.",
    },
    {
      level: 2,
      title: "Atención inmediata",
      min: 50,
      max: 69,
      trafficLight: "naranja" as TrafficLight,
      interpretation: "Existen secciones importantes que requieren atención prioritaria para reducir riesgos.",
    },
    {
      level: 1,
      title: "Riesgo crítico",
      min: 0,
      max: 49,
      trafficLight: "rojo" as TrafficLight,
      interpretation: "La empresa presenta brechas relevantes de cumplimiento, organización documental o control.",
    },
  ],
  modules: [
    {
      id: "constitucion",
      title: "Constitución y estatutos sociales",
      maxPoints: 15,
      order: 1,
      questions: [
        {
          id: "CE01",
          text: "¿La empresa cuenta con acta constitutiva protocolizada ante notario?",
          helpShort: "El acta constitutiva es el instrumento legal mediante el cual se crea formalmente una empresa.",
          helpLong: "Contiene la razón social, objeto, domicilio, capital, socios o accionistas, administración y reglas esenciales de la empresa.",
          order: 1,
          options: [
            { label: "Sí", points: 5 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "CE02",
          text: "¿Los estatutos han sido actualizados en los últimos 10 años?",
          helpShort: "Los estatutos sociales son las reglas internas que determinan cómo se organiza y opera la sociedad.",
          order: 2,
          options: [
            { label: "Sí", points: 4 },
            { label: "Parcial", points: 1 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "CE03",
          text: "¿El objeto social refleja las actividades reales de la empresa?",
          order: 3,
          options: [
            { label: "Sí", points: 3 },
            { label: "Parcial", points: 1 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "CE04",
          text: "¿El capital social y estructura accionaria reflejan la realidad actual?",
          order: 4,
          options: [
            { label: "Sí", points: 3 },
            { label: "Parcial", points: 1 },
            { label: "No", points: 0 },
          ],
        },
      ],
    },
    {
      id: "gobierno",
      title: "Gobierno corporativo",
      maxPoints: 20,
      order: 2,
      questions: [
        {
          id: "GC01",
          text: "¿La empresa celebra asambleas de socios o accionistas regularmente?",
          order: 1,
          options: [
            { label: "Sí, al menos una al año", points: 6 },
            { label: "Esporádicamente", points: 3 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "GC02",
          text: "¿Existe designación formal vigente de administrador o consejo de administración?",
          helpShort: "Son las personas u órganos formalmente responsables de dirigir y representar la empresa.",
          order: 2,
          options: [
            { label: "Sí", points: 5 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "GC03",
          text: "¿Las decisiones relevantes de la empresa se documentan en actas?",
          order: 3,
          options: [
            { label: "Sí", points: 5 },
            { label: "Parcial", points: 2 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "GC04",
          text: "¿Existen reglas claras entre socios, por ejemplo protocolos o acuerdos?",
          order: 4,
          options: [
            { label: "Sí", points: 4 },
            { label: "Parcial", points: 2 },
            { label: "No", points: 0 },
          ],
        },
      ],
    },
    {
      id: "libros",
      title: "Libros corporativos",
      maxPoints: 15,
      order: 3,
      questions: [
        {
          id: "LC01",
          text: "¿La empresa cuenta con libro de actas?",
          helpShort: "El libro de actas conserva evidencia ordenada de las decisiones tomadas por socios o accionistas.",
          order: 1,
          options: [
            { label: "Sí", points: 5 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "LC02",
          text: "¿Cuenta con libro de registro de socios o accionistas?",
          helpShort: "Permite acreditar quiénes integran la sociedad y cuál es su participación.",
          order: 2,
          options: [
            { label: "Sí", points: 5 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "LC03",
          text: "¿Los libros se encuentran actualizados?",
          order: 3,
          options: [
            { label: "Sí", points: 5 },
            { label: "Parcial", points: 2 },
            { label: "No", points: 0 },
          ],
        },
      ],
    },
    {
      id: "representacion",
      title: "Representación legal y poderes",
      maxPoints: 15,
      order: 4,
      questions: [
        {
          id: "RL01",
          text: "¿La empresa cuenta con poderes vigentes?",
          helpShort: "Los poderes vigentes acreditan las facultades de quienes actúan en nombre de la empresa.",
          order: 1,
          options: [
            { label: "Sí", points: 6 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "RL02",
          text: "¿Los poderes reflejan las facultades reales de operación?",
          order: 2,
          options: [
            { label: "Sí", points: 4 },
            { label: "Parcial", points: 2 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "RL03",
          text: "¿Los poderes se han revisado o actualizado en los últimos 5 años?",
          order: 3,
          options: [
            { label: "Sí", points: 5 },
            { label: "No", points: 0 },
          ],
        },
      ],
    },
    {
      id: "contratos",
      title: "Documentación contractual",
      maxPoints: 15,
      order: 5,
      questions: [
        {
          id: "DC01",
          text: "¿La empresa cuenta con contratos por escrito?",
          order: 1,
          options: [
            { label: "Sí", points: 5 },
            { label: "Parcial", points: 2 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "DC02",
          text: "¿La empresa utiliza mecanismos confiables para la firma, conservación o trazabilidad de sus contratos, como firma electrónica, plataformas digitales o tecnologías de registro seguro?",
          order: 2,
          options: [
            { label: "Sí", points: 5 },
            { label: "Parcial", points: 2 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "DC03",
          text: "¿La empresa cuenta con contratos laborales o documentación laboral básica?",
          order: 3,
          options: [
            { label: "Sí", points: 5 },
            { label: "Parcial", points: 2 },
            { label: "No", points: 0 },
          ],
        },
      ],
    },
    {
      id: "cumplimiento",
      title: "Cumplimiento regulatorio",
      maxPoints: 10,
      order: 6,
      questions: [
        {
          id: "CR01",
          text: "De conformidad con el marco normativo aplicable, ¿la empresa cuenta con la documentación y controles necesarios para acreditar el cumplimiento de sus obligaciones?",
          helpShort: "Comprende la documentación y controles que permiten acreditar las obligaciones aplicables.",
          order: 1,
          options: [
            { label: "Sí", points: 5 },
            { label: "Parcial", points: 2 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "CR02",
          text: "¿La empresa identifica claramente qué información, documentos o controles puede requerir la autoridad en caso de revisión, inspección o requerimiento formal?",
          order: 2,
          options: [
            { label: "Sí", points: 5 },
            { label: "Parcial", points: 2 },
            { label: "No", points: 0 },
          ],
        },
      ],
    },
    {
      id: "continuidad",
      title: "Continuidad y legado empresarial",
      maxPoints: 10,
      order: 7,
      questions: [
        {
          id: "CO01",
          text: "¿La empresa cuenta con estrategias de gobierno corporativo, creación de comités, acuerdos entre accionistas o mecanismos formales para la toma de decisiones?",
          helpShort: "Evalúa las reglas y mecanismos que ayudan a sostener la empresa y su toma de decisiones en el tiempo.",
          order: 1,
          options: [
            { label: "Sí", points: 5 },
            { label: "Parcial", points: 2 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "CO02",
          text: "¿La empresa tiene claramente definido el tipo de acciones o participaciones, sus diferencias, derechos y la forma en que pueden transmitirse?",
          order: 2,
          options: [
            { label: "Sí", points: 5 },
            { label: "Parcial", points: 2 },
            { label: "No", points: 0 },
          ],
        },
      ],
    },
  ],
};
