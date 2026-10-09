// Helper de auth para los scripts E2E (nueva arquitectura Gradify).
// Los scripts crean un usuario de prueba propio, lo usan con JWT (Bearer)
// en todas las llamadas y lo borran al final. Sin ADMIN ni carreras: los
// scripts trabajan sobre preview/confirm con el catálogo existente.
const fs = require("fs");
const path = require("path");

const API = process.env.API_URL || "http://localhost:3000";

async function reqJson(method, urlPath, { json, token, timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = {};
    if (json !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API}${urlPath}`, {
      method,
      signal: controller.signal,
      headers,
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { _raw: String(text).slice(0, 300) };
    }
    const resHeaders = {};
    res.headers.forEach((v, k) => { resHeaders[k] = v; });
    return { status: res.status, body, headers: resHeaders };
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Reintenta una llamada frente a 429 respetando Retry-After (los scripts
// hacen register+login y el backend limita auth a 10/15min por IP).
async function withRateRetry(fn, attempts = 4) {
  for (let i = 0; ; i++) {
    const r = await fn();
    if (r.status !== 429 || i >= attempts - 1) return r;
    const waitMs = (Number(r.headers?.["retry-after"]) || 60) * 1000 + 1000;
    console.log(`  (429 rate-limit: esperando ${Math.round(waitMs / 1000)}s, intento ${i + 2}/${attempts})`);
    await sleep(waitMs);
  }
}

// Registra + loguea un usuario de prueba único por corrida.
// Devuelve { nick, token, cleanup } (cleanup borra el usuario, best-effort).
async function setupTestUser(tag) {
  const nick = `test-${tag}`.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  const password = "TestE2E2026!x";
  const reg = await withRateRetry(() => reqJson("POST", "/users/register", {
    json: {
      nickName: nick,
      password,
      email: `${nick}@example.com`,
      firstName: "Test",
      lastName: "E2E",
    },
  }));
  if (reg.status !== 200 && reg.status !== 201) {
    throw new Error(`register ${reg.status}: ${reg.body?.error?.message || reg.body?.message || ""}`);
  }
  const login = await withRateRetry(() => reqJson("POST", "/users/login", {
    json: { nickName: nick, password },
  }));
  if (login.status !== 200 || !login.body?.token) {
    throw new Error(`login ${login.status}: ${login.body?.error?.message || login.body?.message || ""}`);
  }
  const token = login.body.token;
  const cleanup = async () => {
    try {
      await reqJson("DELETE", `/users/${nick}`, { token });
    } catch { /* best-effort */ }
  };
  return { nick, token, cleanup };
}

// Arma el multipart para subir un PDF (mismo campo 'file' que la UI).
function pdfForm(absPath, fileName) {
  const buf = fs.readFileSync(absPath);
  const fd = new FormData();
  fd.append(
    "file",
    new Blob([buf], { type: "application/pdf" }),
    fileName || path.basename(absPath),
  );
  return fd;
}

// POST multipart autenticado (p. ej. /plan-imports/preview). Misma
// normalización de respuesta que reqJson.
async function reqPdf(token, urlPath, absPath, { fileName, timeoutMs = 180000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API}${urlPath}`, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
      body: pdfForm(absPath, fileName),
    });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { _raw: String(text).slice(0, 300) };
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

// Variante cruda del preview para controles negativos (sin archivo o con
// buffer que no es PDF). Misma normalización de respuesta que reqJson.
async function reqPreviewRaw(token, { json, buffer, fileName = "probe.pdf", timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const init = {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    };
    if (json !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(json);
    }
    if (buffer !== undefined) {
      const fd = new FormData();
      fd.append("file", new Blob([buffer], { type: "application/pdf" }), fileName);
      init.body = fd;
    }
    const res = await fetch(`${API}/plan-imports/preview`, init);
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { _raw: String(text).slice(0, 300) };
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { API, reqJson, setupTestUser, pdfForm, reqPdf, reqPreviewRaw };
