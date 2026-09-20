const { rateLimit } = require("express-rate-limit");

function makeLimiter({ windowMs, limit }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });
}

const limiterGeneral = makeLimiter({ windowMs: 60 * 1000, limit: 300 });
const limiterLogin = makeLimiter({ windowMs: 15 * 60 * 1000, limit: 10 });
const limiterChat = makeLimiter({ windowMs: 60 * 1000, limit: 20 });
const limiterParse = makeLimiter({ windowMs: 60 * 1000, limit: 10 });

module.exports = { limiterGeneral, limiterLogin, limiterChat, limiterParse };