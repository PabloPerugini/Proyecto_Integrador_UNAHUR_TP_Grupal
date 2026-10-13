// Defensa CSRF ligera para mutaciones autenticadas por cookie.
// Un fetch cross-site SIEMPRE envía Origin (o Referer); si está presente y no
// es de la lista blanca, se bloquea. Sin Origin/Referer (curl, apps nativas,
// Bearer) no se bloquea: esos no son vectores CSRF de navegador.
// Complementa SameSite=Lax sin romper clientes no-browser.
const checkOrigin = (allowedOrigins) => (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  // Solo importa si hay sesión por cookie (Bearer no es CSRF).
  if (!req.cookies || !req.cookies.token) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ message: "Origen no permitido" });
  }

  if (!origin && referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!allowedOrigins.includes(refererOrigin)) {
        return res.status(403).json({ message: "Origen no permitido" });
      }
    } catch {
      return res.status(403).json({ message: "Origen no permitido" });
    }
  }

  return next();
};

module.exports = { checkOrigin };
