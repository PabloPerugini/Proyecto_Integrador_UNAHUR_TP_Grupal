// Patrón Strategy para la extracción de planes de estudio en PDF.
//
// Antes: previewPlanPdf decidía en línea "parser → IA solo si no detectó
// materias", con banderas sueltas (aiFallback/aiProvider) y el careerHint
// armado adentro del controller. Acá la decisión vive en un contexto
// (extractPlan) que recorre una cadena de estrategias con contrato común:
//
//   estrategia = {
//     name,                       // etiqueta para logs/telemetría
//     canExtract(context),        // ¿está habilitada en esta corrida?
//     extract(context),           // → { parsed, aiFallback, aiProvider }
//     isDefiniteError(error),     // ¿el error corta la cadena o se registra?
//   }
//
// Estrategias concretas: DeterministicParserStrategy (reglas sobre el PDF)
// y AiFallbackStrategy (plan B cuando el parser no ve materias y hay IA
// configurada). El controller ya no sabe cómo se elige: la respuesta HTTP
// queda idéntica a la anterior.
//
// Regla de éxito uniforme: un resultado es aprovechable si trae materias
// (subjectCount > 0). El contexto deja de intentar estrategias apenas lo
// obtiene; si la cadena se agota con un resultado vacío, lo devuelve igual
// y la validación final del controller produce el 422 de siempre.
//
// Extensibilidad: sumar otro extractor (por ejemplo OCR para PDFs
// escaneados) es agregar un objeto a la cadena, sin tocar controller,
// servicios existentes ni cache. Las dependencias se inyectan por factory
// para poder testear con dobles sin mocks de módulos.

const { parseOfficialPlan } = require("./pdfParser.service");
const { extractPlanWithAI } = require("./aiExtract.service");
const { isConfigured: aiIsConfigured } = require("./ai.service");

const careerHintFromFilename = (originalname) =>
  String(originalname || "")
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .slice(0, 120);

const subjectCount = (parsed) =>
  Array.isArray(parsed && parsed.subjects) ? parsed.subjects.length : 0;

const hasSubjects = (parsed) => subjectCount(parsed) > 0;

// ---- Estrategia 1: parser determinístico ----

const createParserStrategy = ({ parseOfficialPlan: parse } = {}) => {
  const reader = parse || parseOfficialPlan;
  return {
    name: "PARSER",
    // Placeholder para políticas futuras (por ejemplo feature flag del
    // parser). Hoy el parser corre siempre primero.
    canExtract: () => true,
    // Un PDF ilegible no se recupera con IA: sus errores son definitivos
    // (statusCode 422) y cortan la cadena.
    isDefiniteError: () => true,

    async extract(context) {
      try {
        return {
          parsed: await reader(context.buffer),
          aiFallback: false,
          aiProvider: null,
        };
      } catch (error) {
        const parseError = new Error(
          "No se pudo leer el PDF. Verificá que contenga texto extraíble"
        );
        parseError.statusCode = 422;
        throw parseError;
      }
    },
  };
};

// ---- Estrategia 2: IA como fallback ----

const createAiFallbackStrategy = ({
  extractPlanWithAI: extractWithAI,
  isConfigured: configured,
} = {}) => {
  const reads = extractWithAI || extractPlanWithAI;
  const available = configured || aiIsConfigured;
  return {
    name: "AI_FALLBACK",
    // Sin proveedor/clave configurados, la estrategia queda fuera de la
    // cadena (misma condición que el isConfigured() del controller).
    canExtract: () => available(),
    // Los fallos de IA (sin cuota, proveedor caído, JSON inválido) se
    // registran pero no cortan: sigue el resultado vacío del parser y la
    // validación final produce el 422 de siempre.
    isDefiniteError: () => false,

    async extract(context) {
      const parsed = await reads(context.buffer, {
        careerHint: context.careerHint,
        expectedMin: null,
        expectedMax: null,
      });
      return {
        parsed,
        aiFallback: true,
        aiProvider: (parsed && parsed.provider) || null,
      };
    },
  };
};

const DEFAULT_STRATEGIES = () => [
  createParserStrategy(),
  createAiFallbackStrategy(),
];

// ---- Contexto de la cadena ----

// Recorre las estrategias habilitadas hasta conseguir materias. Los errores
// definitivos (isDefiniteError) cortan la ejecución; el resto se registran
// y la cadena continúa con el resultado anterior intacto.
const runStrategy = async (strategy, context) => {
  if (!strategy || !strategy.canExtract(context)) return null;
  try {
    return await strategy.extract(context);
  } catch (error) {
    const definite = strategy.isDefiniteError
      ? strategy.isDefiniteError(error)
      : true; // sin política declarada, un error es definitivo (fail-fast).
    if (definite) throw error;
    console.error(`Falló la estrategia de extracción ${strategy.name}:`, error.message);
    return null;
  }
};

const extractPlan = async (buffer, { originalname, strategies } = {}) => {
  // La cadena se respeta tal cual cuando se inyecta (sin volver a sembrar
  // defaults ante una cadena vacía: eso ocultaría configuraciones mal hechas).
  const chain = Array.isArray(strategies)
    ? strategies
    : DEFAULT_STRATEGIES();
  const context = {
    buffer,
    careerHint: careerHintFromFilename(originalname),
  };

  let outcome = null;
  for (const strategy of chain) {
    if (outcome && hasSubjects(outcome.parsed)) break; // ya hay resultado útil
    const next = await runStrategy(strategy, context);
    if (next) outcome = next;
  }

  if (!outcome) {
    throw new Error("No hay estrategia de extracción disponible");
  }

  return {
    parsed: outcome.parsed,
    aiFallback: outcome.aiFallback,
    aiProvider: outcome.aiProvider,
  };
};

module.exports = {
  extractPlan,
  createParserStrategy,
  createAiFallbackStrategy,
  careerHintFromFilename,
  subjectCount,
};
