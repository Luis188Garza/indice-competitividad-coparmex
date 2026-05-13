import { TrafficLight } from "../types";

export const diagnosticICE = {
  id: "ice-coparmex-nld",
  title: "Índice de Competitividad Empresarial",
  subtitle: "Diagnóstico de Madurez Corporativa Empresarial",
  totalPoints: 100,
  levels: [
    {
      level: 4,
      title: "Empresa institucionalizada",
      min: 85,
      max: 100,
      trafficLight: "verde" as TrafficLight,
      interpretation: "La empresa presenta una estructura corporativa sólida, documentada y apta para procesos de crecimiento, financiamiento o inversión.",
    },
    {
      level: 3,
      title: "Cumplimiento sólido",
      min: 70,
      max: 84,
      trafficLight: "verde-claro" as TrafficLight,
      interpretation: "La empresa cuenta con bases corporativas funcionales y requiere ajustes puntuales para fortalecer su institucionalización.",
    },
    {
      level: 2,
      title: "Cumplimiento parcial",
      min: 50,
      max: 69,
      trafficLight: "amarillo" as TrafficLight,
      interpretation: "La empresa presenta una estructura corporativa funcional, pero existen áreas de riesgo relacionadas con documentación, gobierno societario o continuidad.",
    },
    {
      level: 1,
      title: "Riesgo corporativo",
      min: 30,
      max: 49,
      trafficLight: "naranja" as TrafficLight,
      interpretation: "La empresa requiere atención prioritaria para reducir riesgos jurídicos, operativos y de seguimiento institucional.",
    },
    {
      level: 0,
      title: "Alto riesgo jurídico",
      min: 0,
      max: 29,
      trafficLight: "rojo" as TrafficLight,
      interpretation: "La empresa presenta vulnerabilidades jurídicas relevantes que podrían afectar su acceso a financiamiento o generar riesgos entre socios.",
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
          order: 1,
          options: [
            { label: "Sí", points: 5 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "CE02",
          text: "¿Los estatutos han sido actualizados en los últimos 10 años?",
          order: 2,
          options: [
            { label: "Sí", points: 4 },
            { label: "No", points: 1 },
            { label: "Desconoce", points: 0 },
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
          text: "¿Existe designación formal vigente de administrador o consejo?",
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
            { label: "Siempre", points: 5 },
            { label: "A veces", points: 2 },
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
          order: 1,
          options: [
            { label: "Sí", points: 5 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "LC02",
          text: "¿Cuenta con libro de registro de socios o accionistas?",
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
          text: "¿Los representantes legales cuentan con poderes notariales vigentes?",
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
          text: "¿La empresa utiliza contratos escritos con clientes?",
          order: 1,
          options: [
            { label: "Sí", points: 5 },
            { label: "Parcial", points: 2 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "DC02",
          text: "¿Existen contratos formales con proveedores relevantes?",
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
          text: "¿La empresa tiene identificado a su beneficiario controlador?",
          order: 1,
          options: [
            { label: "Sí", points: 5 },
            { label: "No", points: 0 },
            { label: "Desconoce", points: 0 },
          ],
        },
        {
          id: "CR02",
          text: "¿Cuenta con documentación corporativa disponible para autoridades o bancos?",
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
      title: "Continuidad empresarial",
      maxPoints: 10,
      order: 7,
      questions: [
        {
          id: "CO01",
          text: "¿La empresa tiene reglas de sucesión o continuidad empresarial?",
          order: 1,
          options: [
            { label: "Sí", points: 5 },
            { label: "Parcial", points: 2 },
            { label: "No", points: 0 },
          ],
        },
        {
          id: "CO02",
          text: "¿Existe claridad sobre la transmisión de acciones o partes sociales?",
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
