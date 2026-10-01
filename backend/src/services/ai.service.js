const { getCache, setCache } = require("./cache.service");

// Ajustables por .env (1B.A1): defaults = valores históricos, así con las
// variables ausentes el comportamiento sigue siendo idéntico al actual.
const REQUEST_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 60000;
const RETRY_DELAY_MS = Number(process.env.AI_RETRY_MS) || 3000;

// 1B.A3: una línea por llamada de IA para poder ver provider/ms/cached sin
// tener que leer el código. No cambia la respuesta, solo observabilidad.
function logAiCall(entry) {
  try {
    console.log("[ai]", JSON.stringify(entry));
  } catch {
    // el log nunca puede romper la llamada
  }
}

class ProviderError extends Error {
  constructor(provider, status, message, retryAfterMs = null) {
    super(`${provider} HTTP ${status}: ${message}`);
    this.provider = provider;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

async function postJson(providerId, url, headers, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const retryAfter = res.headers?.get?.("retry-after");
      const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 || null : null;
      let detail = "";
      try {
        detail = (await res.text()).slice(0, 200);
      } catch {
        /* sin cuerpo */
      }
      throw new ProviderError(providerId, res.status, detail || res.statusText, retryAfterMs);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const backoffMs = (attempt, retryAfterMs) => {
  if (retryAfterMs) return Math.min(retryAfterMs, 30000);
  const base = RETRY_DELAY_MS * 2 ** (attempt - 1);
  return Math.min(base + Math.floor(Math.random() * 500), 15000);
};

const PROVIDERS = [
  {
    id: "groq",
    enabled: () => !!process.env.GROQ_API_KEY,
    async run(system, user) {
      const data = await postJson(
        "groq",
        "https://api.groq.com/openai/v1/chat/completions",
        {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        {
          model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.4,
          response_format: { type: "json_object" },
        },
      );
      return {
        text: data.choices?.[0]?.message?.content?.trim(),
        usage: data.usage || null,
      };
    },
  },
  {
    id: "gemini",
    enabled: () => !!process.env.GEMINI_API_KEY,
    async run(system, user) {
      const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
      const data = await postJson(
        "gemini",
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        {
          contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }],
          generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
        },
      );
      const parts = data.candidates?.[0]?.content?.parts || [];
      return {
        text: parts.map((p) => p.text).join("").trim(),
        usage: data.usageMetadata || null,
      };
    },
  },
];

async function chat(system, user, cacheKey, preferFirst = null) {
  const t0 = Date.now();
  if (cacheKey) {
    const hit = await getCache(cacheKey);
    if (hit) {
      // un caché corrupto hoy tiraría un 500 desde JSON.parse: se trata como miss.
      try {
        const parsed = JSON.parse(hit);
        logAiCall({ cached: true, provider: parsed.provider || "cache", ms: Date.now() - t0 });
        return { reply: parsed.reply, provider: parsed.provider || "cache", cached: true };
      } catch (error) {
        logAiCall({ cached: true, corrupto: true, error: error.message });
      }
    }
  }

  let lastError = null;
  const errors = [];
  const available = PROVIDERS.filter((p) => p.enabled());
  const providers = preferFirst
    ? [...available.filter((p) => p.id === preferFirst), ...available.filter((p) => p.id !== preferFirst)]
    : available;
  for (const provider of providers) {
    const started = Date.now();
    let attempt = 0;
    for (;;) {
      attempt += 1;
      try {
        const { text: reply, usage } = await provider.run(system, user);
        if (!reply) throw new Error("respuesta vacía");
        if (cacheKey) await setCache(cacheKey, { reply, provider: provider.id, usage }, 604800);
        const ms = Date.now() - started;
        logAiCall({ cached: false, provider: provider.id, ms, attempt, totalMs: Date.now() - t0, usage: usage || undefined });
        return { reply, provider: provider.id, ms, cached: false, usage: usage || null };
      } catch (error) {
        // 429/5xx suelen ser transitorios (modelo saturado): un reintento con backoff.
        const status = error instanceof ProviderError ? error.status : null;
        const retryable = status
          ? [429, 500, 502, 503, 504].includes(status)
          : /HTTP (429|500|502|503|504)\b/.test(error.message);
        if (retryable && attempt === 1) {
          const wait = backoffMs(attempt, error.retryAfterMs);
          logAiCall({ cached: false, provider: provider.id, reintento: true, error: error.message, esperaMs: wait });
          await sleep(wait);
          continue;
        }
        lastError = error;
        errors.push({ provider: provider.id, error });
        logAiCall({ cached: false, provider: provider.id, fallo: true, ms: Date.now() - started, error: error.message });
        break;
      }
    }
  }
  const meaningful =
    errors.find((e) => !/fetch failed|ECONNREFUSED|operation was aborted/i.test(e.error.message))?.error ||
    lastError;
  if (meaningful) {
    meaningful.message += ` | intentos: ${errors.map((e) => `${e.provider}:${e.error.message.slice(-120)}`).join(" ; ")}`;
    throw meaningful;
  }
  throw lastError;
}

function isConfigured() {
  return PROVIDERS.some((p) => p.enabled());
}

module.exports = { chat, isConfigured };
