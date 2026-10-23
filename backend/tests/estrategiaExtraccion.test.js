const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractPlan,
  createParserStrategy,
  createAiFallbackStrategy,
  careerHintFromFilename,
} = require("../src/services/planExtraction.strategy");

// Dobles de prueba: las dependencias se inyectan en las factories de las
// estrategias, así los tests no tocan pdfParser.service ni aiExtract.service.
// Los "parsed" respetan el contrato { subjects: [...] } de los servicios reales.
const subjectsOf = (count) => ({
  subjects: Array.from({ length: count }, (_, i) => ({ name: `M${i + 1}` })),
});

const parserStub = (result) =>
  createParserStrategy({
    parseOfficialPlan:
      typeof result === "function" ? result : async () => result,
  });

const aiStub = ({ configured = true, result, error } = {}) =>
  createAiFallbackStrategy({
    extractPlanWithAI:
      error
        ? async () => {
            throw error;
          }
        : async () => result,
    isConfigured: () => configured,
  });

test("Strategy: parser con materias alcanza, no se llama a la IA", async () => {
  let aiCalled = false;
  const ai = aiStub({ result: subjectsOf(2) });
  const originalExtract = ai.extract.bind(ai);
  ai.extract = async (context) => {
    aiCalled = true;
    return originalExtract(context);
  };

  const outcome = await extractPlan("pdf", {
    strategies: [parserStub(subjectsOf(3)), ai],
  });

  assert.equal(aiCalled, false);
  assert.equal(outcome.aiFallback, false);
  assert.equal(outcome.aiProvider, null);
  assert.equal(outcome.parsed.subjects.length, 3);
});

test("Strategy: parser sin materias habilita el fallback de IA", async () => {
  const outcome = await extractPlan("pdf", {
    strategies: [
      parserStub(subjectsOf(0)),
      aiStub({ result: { subjects: subjectsOf(2).subjects, provider: "groq" } }),
    ],
  });

  assert.equal(outcome.aiFallback, true);
  assert.equal(outcome.aiProvider, "groq");
  assert.equal(outcome.parsed.subjects.length, 2);
});

test("Strategy: IA sin proveedor configurado queda fuera de la cadena", async () => {
  let aiCalled = false;
  const ai = aiStub({ configured: false, result: subjectsOf(2) });
  const originalExtract = ai.extract.bind(ai);
  ai.extract = async (context) => {
    aiCalled = true;
    return originalExtract(context);
  };

  const outcome = await extractPlan("pdf", {
    strategies: [parserStub(subjectsOf(0)), ai],
  });

  assert.equal(aiCalled, false);
  assert.equal(outcome.aiFallback, false);
  assert.equal(outcome.parsed.subjects.length, 0);
});

test("Strategy: fallo de IA no corta la cadena (queda el parser vacío → 422 final)", async () => {
  const outcome = await extractPlan("pdf", {
    strategies: [
      parserStub(subjectsOf(0)),
      aiStub({ error: new Error("proveedor sin cuota") }),
    ],
  });

  assert.equal(outcome.aiFallback, false);
  assert.equal(outcome.aiProvider, null);
  assert.equal(outcome.parsed.subjects.length, 0);
});

test("Strategy: error del parser es definitivo (corta la cadena con 422)", async () => {
  const parser = parserStub(async () => {
    throw new Error("pdf ilegible");
  });

  await assert.rejects(
    () => extractPlan("pdf", { strategies: [parser, aiStub({ result: subjectsOf(2) })] }),
    (error) => error.statusCode === 422,
  );
});

test("Strategy: la cadena respeta el orden declarado (parser primero, IA como fallback)", async () => {
  const ran = [];
  const parser = parserStub(subjectsOf(1));
  const originalParserExtract = parser.extract.bind(parser);
  parser.extract = async (context) => {
    ran.push("parser");
    return originalParserExtract(context);
  };
  const ai = aiStub({ result: subjectsOf(9) });
  const originalAiExtract = ai.extract.bind(ai);
  ai.extract = async (context) => {
    ran.push("ia");
    return originalAiExtract(context);
  };

  const outcome = await extractPlan("pdf", { strategies: [parser, ai] });

  assert.deepEqual(ran, ["parser"], "con materias del parser, la IA nunca se llega a habilitar");
  assert.equal(outcome.aiFallback, false);
  assert.equal(outcome.parsed.subjects.length, 1);
});

test("Strategy: en una cadena vacía el error es explícito", async () => {
  await assert.rejects(
    () => extractPlan("pdf", { strategies: [] }),
    /No hay estrategia de extracción disponible/,
  );
});

test("careerHintFromFilename: normaliza guiones/bajos y recorta a 120", () => {
  assert.equal(
    careerHintFromFilename("Tec_Ingenieria-Unahur-2025.pdf"),
    "Tec Ingenieria Unahur 2025",
  );
  assert.equal(careerHintFromFilename("x".repeat(500)).length, 120);
});
