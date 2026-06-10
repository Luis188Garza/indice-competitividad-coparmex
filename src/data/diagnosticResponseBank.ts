export type DiagnosticResponseBankItem = {
  moduleId: string;
  title: string;
  summary: string;
  findings: string[];
  businessImplications: string[];
  risks: string[];
  recommendations: string[];
  legalFramework: string[];
  suggestedServices: string[];
  suggestedProviderTypes: string[];
};

export const diagnosticResponseBank: DiagnosticResponseBankItem[] = [
  {
    moduleId: "constitucion",
    title: "Constitución y estatutos sociales",
    summary: "Evalúa si la empresa cuenta con una base societaria vigente, coherente con su operación y útil para decisiones corporativas relevantes.",
    findings: [
      "La empresa requiere confirmar que su acta constitutiva, estatutos sociales, objeto social, capital social y estructura accionaria reflejan su realidad actual.",
      "La documentación constitutiva no acredita plenamente las actividades, socios o estructura patrimonial vigentes y requiere revisión.",
    ],
    businessImplications: [
      "Una estructura societaria desactualizada puede retrasar trámites bancarios, operaciones con terceros, inversión, venta de participación o incorporación de nuevos socios.",
      "La falta de claridad estatutaria puede generar demoras en decisiones corporativas y procesos de formalización.",
    ],
    risks: [
      "Riesgo de inconsistencias entre documentos corporativos, operación real y estructura accionaria.",
      "Riesgo de observaciones en procesos de financiamiento, auditoría, compraventa, licitación o revisión legal.",
    ],
    recommendations: [
      "Realizar una revisión integral del acta constitutiva, estatutos sociales, objeto social, capital social y estructura accionaria.",
      "Actualizar estatutos cuando existan cambios relevantes en actividades, socios, administración, reglas internas o estructura de capital.",
    ],
    legalFramework: [
      "Mejores prácticas nacionales e internacionales en gobierno, cumplimiento y documentación empresarial.",
      "Ley General de Sociedades Mercantiles.",
      "Código de Comercio.",
      "Estatutos sociales e instrumentos notariales aplicables.",
    ],
    suggestedServices: [
      "Revisión de acta constitutiva y estatutos sociales.",
      "Actualización estatutaria.",
      "Regularización de capital social y estructura accionaria.",
    ],
    suggestedProviderTypes: [
      "Notaría pública.",
      "Abogado corporativo.",
      "Consultor en gobierno societario.",
    ],
  },
  {
    moduleId: "gobierno",
    title: "Gobierno corporativo",
    summary: "Mide la existencia de asambleas, documentación de decisiones, administración o consejo vigente y acuerdos claros entre socios.",
    findings: [
      "La empresa no acredita de forma suficiente sus asambleas, decisiones relevantes o acuerdos entre socios.",
      "La administración, consejo o responsables formales requieren revisión para confirmar vigencia y trazabilidad.",
    ],
    businessImplications: [
      "Un gobierno corporativo débil reduce transparencia, trazabilidad y confianza entre socios, bancos, inversionistas y aliados comerciales.",
      "Las decisiones no documentadas pueden complicar la ejecución de acuerdos, la continuidad de la operación y la defensa de decisiones corporativas.",
    ],
    risks: [
      "Riesgo de conflictos societarios por falta de actas, acuerdos o reglas claras de decisión.",
      "Riesgo de debilidad institucional ante procesos de crédito, inversión, auditoría o sucesión.",
    ],
    recommendations: [
      "Implementar un calendario mínimo de asambleas y documentar decisiones relevantes en actas.",
      "Definir reglas básicas entre socios para administración, voto, salida, sucesión, resolución de conflictos y aprobación de operaciones relevantes.",
    ],
    legalFramework: [
      "Mejores prácticas nacionales e internacionales en gobierno, cumplimiento y documentación empresarial.",
      "Ley General de Sociedades Mercantiles.",
      "Estatutos sociales de la empresa.",
      "Acuerdos societarios o protocolos internos aplicables.",
    ],
    suggestedServices: [
      "Diseño de gobierno corporativo básico.",
      "Regularización y elaboración de actas.",
      "Protocolos o acuerdos entre socios.",
    ],
    suggestedProviderTypes: [
      "Abogado corporativo.",
      "Consultor en gobierno corporativo.",
      "Secretario corporativo externo.",
    ],
  },
  {
    moduleId: "libros",
    title: "Libros corporativos",
    summary: "Revisa la existencia y actualización del libro de actas, libro de socios o accionistas y registro de movimientos societarios.",
    findings: [
      "Los libros corporativos están incompletos, desactualizados o no reflejan movimientos societarios relevantes.",
      "La empresa no acredita evidencia ordenada de actas, socios, accionistas, transmisiones o cambios societarios.",
    ],
    businessImplications: [
      "La falta de libros actualizados dificulta acreditar propiedad, acuerdos, participación social y cambios societarios.",
      "Puede afectar procesos de financiamiento, auditoría, venta, sucesión, revisión documental o entrada de nuevos socios.",
    ],
    risks: [
      "Riesgo de observaciones legales por ausencia o desactualización de libros corporativos obligatorios.",
      "Riesgo de conflictos sobre titularidad, participación social, validez de acuerdos o movimientos societarios.",
    ],
    recommendations: [
      "Integrar y actualizar libro de actas y libro de registro de socios o accionistas.",
      "Realizar una revisión documental para identificar asientos pendientes y regularizar movimientos societarios.",
    ],
    legalFramework: [
      "Mejores prácticas nacionales e internacionales en gobierno, cumplimiento y documentación empresarial.",
      "Ley General de Sociedades Mercantiles.",
      "Código de Comercio.",
      "Obligaciones corporativas de conservación documental.",
    ],
    suggestedServices: [
      "Apertura o actualización de libros corporativos.",
      "Regularización de asientos societarios.",
      "Auditoría documental corporativa.",
    ],
    suggestedProviderTypes: [
      "Abogado corporativo.",
      "Notaría pública.",
      "Especialista en documentación societaria.",
    ],
  },
  {
    moduleId: "representacion",
    title: "Representación legal y poderes",
    summary: "Evalúa poderes, representantes legales, facultades vigentes y soporte documental para actuar en nombre de la empresa.",
    findings: [
      "La representación legal no acredita plenamente las facultades necesarias para la operación real.",
      "Los poderes y el soporte documental de representación requieren revisión para confirmar vigencia, alcance y suficiencia.",
    ],
    businessImplications: [
      "Poderes insuficientes pueden retrasar contratos, trámites bancarios, operaciones notariales, licitaciones o gestiones ante autoridades.",
      "La falta de claridad en facultades puede generar dependencia operativa, decisiones vulnerables o actos cuestionables.",
    ],
    risks: [
      "Riesgo de actos firmados por personas sin facultades suficientes.",
      "Riesgo de rechazo en trámites financieros, notariales, administrativos o comerciales.",
    ],
    recommendations: [
      "Revisar vigencia, alcance y suficiencia de poderes notariales y nombramientos de representantes legales.",
      "Actualizar facultades para cubrir actos de administración, pleitos y cobranzas, títulos de crédito o dominio cuando aplique.",
    ],
    legalFramework: [
      "Mejores prácticas nacionales e internacionales en gobierno, cumplimiento y documentación empresarial.",
      "Código Civil aplicable.",
      "Ley General de Sociedades Mercantiles.",
      "Instrumentos notariales de representación.",
    ],
    suggestedServices: [
      "Revisión de poderes y facultades.",
      "Actualización de representantes legales.",
      "Formalización notarial de nombramientos y poderes.",
    ],
    suggestedProviderTypes: [
      "Notaría pública.",
      "Abogado corporativo.",
      "Asesor legal empresarial.",
    ],
  },
  {
    moduleId: "contratos",
    title: "Documentación contractual",
    summary: "Analiza contratos con clientes, proveedores, documentación laboral y cultura contractual de la empresa.",
    findings: [
      "La documentación contractual está incompleta o no acredita todas las relaciones relevantes con clientes, proveedores o personal.",
      "La empresa opera con acuerdos verbales, formatos incompletos o contratos no actualizados.",
    ],
    businessImplications: [
      "Contratos débiles reducen capacidad de exigir cumplimiento, cobrar, delimitar responsabilidades o resolver controversias.",
      "La falta de documentación laboral o comercial puede elevar costos y riesgos ante disputas, incumplimientos o revisiones.",
    ],
    risks: [
      "Riesgo de incumplimientos sin mecanismos claros de solución.",
      "Riesgo laboral, comercial o de responsabilidad por falta de documentos básicos.",
    ],
    recommendations: [
      "Estandarizar contratos con clientes, proveedores y personal clave.",
      "Revisar cláusulas de pago, entregables, confidencialidad, terminación, responsabilidad, jurisdicción y solución de controversias.",
    ],
    legalFramework: [
      "Mejores prácticas nacionales e internacionales en gobierno, cumplimiento y documentación empresarial.",
      "Código de Comercio.",
      "Código Civil aplicable.",
      "Ley Federal del Trabajo.",
    ],
    suggestedServices: [
      "Diseño de contratos comerciales.",
      "Revisión de contratos con proveedores y clientes.",
      "Regularización documental laboral básica.",
    ],
    suggestedProviderTypes: [
      "Abogado contractual.",
      "Especialista laboral.",
      "Consultor legal empresarial.",
    ],
  },
  {
    moduleId: "cumplimiento",
    title: "Cumplimiento regulatorio",
    summary: "Evalúa documentación, controles, expediente empresarial y preparación para procesos de revisión, financiamiento, cumplimiento o crecimiento empresarial.",
    findings: [
      "La empresa no acredita plenamente la información y los controles necesarios para demostrar el cumplimiento de sus obligaciones.",
      "El expediente empresarial para autoridades, banca, crédito o procesos de crecimiento está incompleto.",
    ],
    businessImplications: [
      "La falta de información ordenada puede retrasar apertura de cuentas, créditos, auditorías, procesos de cumplimiento o validaciones de clientes estratégicos.",
      "Una baja preparación documental puede reducir competitividad frente a cadenas de suministro más exigentes.",
    ],
    risks: [
      "Riesgo de observaciones por beneficiario controlador o expediente corporativo incompleto.",
      "Riesgo de demoras o rechazos en procesos bancarios, fiscales, comerciales, regulatorios o de clientes internacionales.",
    ],
    recommendations: [
      "Integrar expediente corporativo actualizado para bancos, autoridades, clientes estratégicos y procesos de cumplimiento.",
      "Identificar y documentar beneficiario controlador conforme a obligaciones aplicables y preparar evidencia documental de soporte.",
    ],
    legalFramework: [
      "Mejores prácticas nacionales e internacionales en gobierno, cumplimiento y documentación empresarial.",
      "Código Fiscal de la Federación.",
      "Disposiciones sobre beneficiario controlador.",
      "Normativa aplicable a identificación corporativa y debida diligencia.",
    ],
    suggestedServices: [
      "Integración de expediente corporativo.",
      "Revisión de beneficiario controlador.",
      "Checklist de cumplimiento para banca, crédito y clientes estratégicos.",
    ],
    suggestedProviderTypes: [
      "Asesor fiscal.",
      "Abogado corporativo.",
      "Consultor en cumplimiento empresarial.",
    ],
  },
  {
    moduleId: "continuidad",
    title: "Continuidad y legado empresarial",
    summary: "Mide continuidad y legado empresarial, sucesión, dependencia de personas clave y sostenibilidad organizacional.",
    findings: [
      "La empresa no acredita reglas claras de sucesión, continuidad o transmisión de acciones o partes sociales.",
      "La operación depende de personas clave sin documentación suficiente de procesos, responsables o medidas de continuidad.",
    ],
    businessImplications: [
      "La ausencia de reglas de continuidad puede afectar operación, propiedad y control ante salida, incapacidad, fallecimiento o cambio de socios.",
      "La dependencia de personas clave reduce sostenibilidad institucional y puede frenar crecimiento generacional.",
    ],
    risks: [
      "Riesgo de conflictos familiares o societarios ante eventos sucesorios.",
      "Riesgo de interrupción operativa por falta de responsables, reglas, documentación o procesos críticos.",
    ],
    recommendations: [
      "Definir reglas mínimas de sucesión, transmisión de acciones o partes sociales y continuidad operativa.",
      "Documentar responsables internos, procesos críticos y acuerdos que permitan sostener la operación ante contingencias.",
    ],
    legalFramework: [
      "Mejores prácticas nacionales e internacionales en gobierno, cumplimiento y documentación empresarial.",
      "Ley General de Sociedades Mercantiles.",
      "Estatutos sociales.",
      "Disposiciones civiles y sucesorias aplicables.",
    ],
    suggestedServices: [
      "Plan básico de continuidad y legado empresarial.",
      "Protocolo de sucesión empresarial.",
      "Revisión de reglas de transmisión societaria.",
    ],
    suggestedProviderTypes: [
      "Abogado corporativo.",
      "Consultor de continuidad empresarial.",
      "Asesor patrimonial o sucesorio.",
    ],
  },
];
