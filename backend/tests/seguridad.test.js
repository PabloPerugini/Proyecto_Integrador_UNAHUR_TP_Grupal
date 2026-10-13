const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = "secreto-de-prueba-largo-1234";

const { checkOrigin } = require("../src/middlewares/checkOrigin");
const { signToken } = require("../src/middlewares/auth");
const jwt = require("jsonwebtoken");

const mw = checkOrigin(["http://localhost:5173"]);

const fakeRes = () => {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

const run = (req) =>
  new Promise((resolve) => {
    const res = fakeRes();
    mw(req, res, () => {
      res.passed = true;
      resolve(res);
    });
    // Si el middleware respondió sin next(), resolver igual.
    setImmediate(() => resolve(res));
  });

test("checkOrigin: GET siempre pasa", async () => {
  const res = await run({ method: "GET", cookies: {}, headers: {} });
  assert.equal(res.passed, true);
});

test("checkOrigin: POST sin cookie pasa (Bearer no es CSRF)", async () => {
  const res = await run({ method: "POST", cookies: {}, headers: {} });
  assert.equal(res.passed, true);
});

test("checkOrigin: POST con cookie y Origin permitido pasa", async () => {
  const res = await run({
    method: "POST",
    cookies: { token: "x" },
    headers: { origin: "http://localhost:5173" },
  });
  assert.equal(res.passed, true);
});

test("checkOrigin: POST con cookie y Origin ajeno da 403", async () => {
  const res = await run({
    method: "POST",
    cookies: { token: "x" },
    headers: { origin: "http://malicioso.com" },
  });
  assert.equal(res.statusCode, 403);
});

test("checkOrigin: Referer ajeno sin Origin da 403", async () => {
  const res = await run({
    method: "PUT",
    cookies: { token: "x" },
    headers: { referer: "http://malicioso.com/pagina" },
  });
  assert.equal(res.statusCode, 403);
});

test("signToken: incluye versión para invalidar logout", () => {
  const token = signToken("abc123", 3);
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  assert.equal(payload.sub, "abc123");
  assert.equal(payload.v, 3);
});
