const mongoose = require("mongoose");

// Auth leve de la app: lee el header x-user-id (o body.userId) y lo deja en req.userId.
// No bloquea: si no viene, req.userId queda null (endpoints que lo necesiten lo validan).
const authUser = (req, res, next) => {
  let raw =
    req.header("x-user-id") || req.body?.userId || req.query?.userId || null;
  if (raw && mongoose.Types.ObjectId.isValid(raw)) {
    req.userId = raw;
  } else {
    req.userId = null;
  }
  next();
};

module.exports = authUser;