const { getCache, setCache } = require("./cache.service");

const REQUEST_TIMEOUT_MS = 30000;

async function postJson(url, headers, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const PROVIDERS = [
  {
    id: "groq",
    enabled: () => !!process.env.GROQ_API_KEY,
    async run(system, user) {
      const data = await postJson(
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
        },
      );
      return data.choices?.[0]?.message?.content?.trim();
    },
  },
  {
    id: "gemini",
    enabled: () => !!process.env.GEMINI_API_KEY,
    async run(system, user) {
      const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
      const data = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        {
          contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }],
          generationConfig: { temperature: 0.4 },
        },
      );
      const parts = data.candidates?.[0]?.content?.parts || [];
      return parts.map((p) => p.text).join("").trim();
    },
  },
  {
    id: "ollama",
    enabled: () => !!process.env.OLLAMA_URL,
    async run(system, user) {
      const base = process.env.OLLAMA_URL || "http://localhost:11434";
      const data = await postJson(
        `${base}/api/chat`,
        { "Content-Type": "application/json" },
        {
          model: process.env.OLLAMA_MODEL || "llama3.2",
          stream: false,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        },
      );
      return data.message?.content?.trim();
    },
  },
];

async function chat(system, user, cacheKey) {
  if (cacheKey) {
    const hit = await getCache(cacheKey);
    if (hit) {
      const parsed = JSON.parse(hit);
      return { reply: parsed.reply, provider: parsed.provider || "cache", cached: true };
    }
  }

  let lastError = null;
  const errors = [];
  const providers = PROVIDERS.filter((p) => p.enabled());
  for (const provider of providers) {
    const started = Date.now();
    try {
      const reply = await provider.run(system, user);
      if (!reply) throw new Error("respuesta vacía");
      if (cacheKey) await setCache(cacheKey, { reply, provider: provider.id }, 604800);
      return { reply, provider: provider.id, ms: Date.now() - started, cached: false };
    } catch (error) {
      lastError = error;
      errors.push({ provider: provider.id, error });
    }
  }
  const meaningful =
    errors.find((e) => !/fetch failed|ECONNREFUSED|operation was aborted/i.test(e.error.message))?.error ||
    lastError;
  throw meaningful;
}

function isConfigured() {
  return PROVIDERS.some((p) => p.enabled());
}

module.exports = { chat, isConfigured };