// Límite de tasa para las rutas que gastan créditos de IA externa
// (parse-official / parse-correlativas): la IA es fallback, pero cada PDF
// distinto sale a Groq/Gemini con decenas de miles de caracteres, así que
// sin cota un cliente anónimo puede consumir las claves del proyecto.
//
// Diseño (plan 1.7 + corrección por regresión de tests):
//  * Clave = x-user-id si el cliente lo manda (UI), si no la IP.
//  * Loopback y redes privadas quedan exentas POR DEFECTO: ahí corren los
//    tests masivos (43 PDFs) y la UI en docker/LAN. Un atacante desde
//    Internet no llega como 127.x / 10.x / 172.16-31.x / 192.168.x.
//    AI_RATE_PRIVATE_EXEMPT=false lo desactiva si el backend queda expuesto
//    a una red de confianza que no es tuya.
//  * AI_RATE_MAX=0 desactiva el límite (corridas de tests contra un backend
//    remoto), AI_RATE_MAX/VIEN AI_RATE_WINDOW_MS lo ajustan.
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const PRIVATE_EXEMPT = String(process.env.AI_RATE_PRIVATE_EXEMPT ?? "true") !== "false";
const MAX = Number(process.env.AI_RATE_MAX ?? 10);
const WINDOW_MS = Number(process.env.AI_RATE_WINDOW_MS) || 15 * 60 * 1000; // 15 min

const isPrivateOrLoopback = (ip) => {
  if (!ip) return false;
  const v = ip.replace(/^::ffff:/, "");
  if (v === "::1" || v === "127.0.0.1") return true;
  if (!PRIVATE_EXEMPT) return false;
  if (/^10\./.test(v)) return true;
  if (/^192\.168\./.test(v)) return true;
  const m = v.match(/^172\.(\d+)\./);
  return !!m && Number(m[1]) >= 16 && Number(m[1]) <= 31;
};

const aiRateLimit =
  MAX > 0
    ? rateLimit({
        windowMs: WINDOW_MS,
        limit: MAX,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        // ipKeyGenerator normaliza IPv6 (evita ERR_ERL_KEY_GEN_IPV6: sin esto,
        // un mismo cliente IPv6 cambia de prefijo y evade el límite).
        keyGenerator: (req) => req.headers["x-user-id"] || ipKeyGenerator(req.ip),
        skip: (req) => isPrivateOrLoopback(req.ip),
        message: {
          message:
            "Se alcanzó el límite de procesamiento con IA. Esperá unos minutos y volvé a intentar.",
        },
      })
    : (_req, _res, next) => next(); // AI_RATE_MAX=0 => sin límite

module.exports = { aiRateLimit, isPrivateOrLoopback };
