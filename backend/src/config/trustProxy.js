// TRUST_PROXY: configuración de Express para leer req.ip detrás de un proxy.
// Sin esto todos los clientes comparten la IP del proxy (el rate limit castiga
// a todos) y X-Forwarded-For no se valida. Valores: "false", "true", un número
// de saltos confiables, o una lista de IPs/subredes ("loopback,10.0.0.0/8").
function parseTrustProxy(value) {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();
  if (!text) return null;
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^\d+$/.test(text)) return Number(text);

  return text;
}

module.exports = { parseTrustProxy };
