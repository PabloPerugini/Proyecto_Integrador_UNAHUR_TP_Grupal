const jwt = require("jsonwebtoken");

const COOKIE_NAME = "token";
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";
const COOKIE_SECURE =
  process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";

function signToken(userId, version = 0) {
  const sub = String(userId);
  return jwt.sign({ sub, id: sub, v: version }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

function getUserId(req) {
  // El header Bearer tiene prioridad (API / pruebas); la cookie httpOnly
  // sigue siendo la vía del navegador.
  const authHeader = req.headers?.authorization;
  let token = null;

  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice("Bearer ".length).trim() || null;
  }

  if (!token) token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

const optionalAuth = async (req, res, next) => {
  req.userId = getUserId(req);
  // Adjunta el usuario para decisiones por rol (ej. includeArchived solo ADMIN).
  // Best-effort: sin usuario sigue como anónimo.
  try {
    if (req.userId) {
      const User = require("../models/user");
      req.user = await User.findById(req.userId).select("_id nickName rol");
    }
  } catch {
    // Sin DB: sigue anónimo.
  }
  next();
};

module.exports = {
  optionalAuth,
  getUserId,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  COOKIE_NAME,
};