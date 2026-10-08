const jwt = require("jsonwebtoken");

const COOKIE_NAME = "token";
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";
const COOKIE_SECURE =
  process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

const requireAuth = (req, res, next) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "No estás autenticado" });
  }
  req.userId = userId;
  next();
};

const optionalAuth = (req, res, next) => {
  req.userId = getUserId(req);
  next();
};

module.exports = {
  requireAuth,
  optionalAuth,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  COOKIE_NAME,
};