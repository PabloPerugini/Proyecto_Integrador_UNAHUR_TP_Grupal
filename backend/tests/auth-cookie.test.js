const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-cookie";

const {
  signToken,
  setAuthCookie,
  clearAuthCookie,
} = require("../src/middlewares/auth");
const authUser = require("../src/middlewares/authUser");
const User = require("../src/models/user");
const userService = require("../src/services/userService");
const userController = require("../src/controllers/user.controllers");

function mockRes() {
  const calls = { cookie: [], clearCookie: [], status: null, body: null };
  const res = {
    calls,
    cookie: (name, value, opts) => {
      calls.cookie.push({ name, value, opts });
      return res;
    },
    clearCookie: (name, opts) => {
      calls.clearCookie.push({ name, opts });
      return res;
    },
    status: (code) => {
      calls.status = code;
      return res;
    },
    json: (body) => {
      calls.body = body;
      return res;
    },
  };
  return res;
}

test("auth-cookie: setAuthCookie espeja JWT en cookie httpOnly `token`", () => {
  const res = mockRes();
  const token = signToken("u1");
  setAuthCookie(res, token);
  assert.equal(res.calls.cookie.length, 1);
  assert.equal(res.calls.cookie[0].name, "token");
  assert.equal(res.calls.cookie[0].value, token);
  assert.equal(res.calls.cookie[0].opts.httpOnly, true);
});

test("auth-cookie: clearAuthCookie limpia `token` (logout)", () => {
  const res = mockRes();
  clearAuthCookie(res);
  assert.equal(res.calls.clearCookie.length, 1);
  assert.equal(res.calls.clearCookie[0].name, "token");
});

test("auth-cookie: authUser acepta Bearer (legado) y cookie (rama)", async () => {
  const origFind = User.findById;
  User.findById = async () => ({ _id: "u1", nickName: "tester" });
  try {
    const legacy = jwt.sign({ id: "u1" }, process.env.JWT_SECRET);
    const req1 = { headers: { authorization: `Bearer ${legacy}` }, cookies: {} };
    let next1 = false;
    await authUser(req1, mockRes(), () => {
      next1 = true;
    });
    assert.equal(next1, true);
    assert.equal(String(req1.user._id), "u1");

    const cookieTok = signToken("u1");
    const req2 = { headers: {}, cookies: { token: cookieTok } };
    let next2 = false;
    await authUser(req2, mockRes(), () => {
      next2 = true;
    });
    assert.equal(next2, true);
    assert.equal(String(req2.userId), "u1");

    const req3 = { headers: {}, cookies: {} };
    const res3 = mockRes();
    let next3 = false;
    await authUser(req3, res3, () => {
      next3 = true;
    });
    assert.equal(next3, false);
    assert.equal(res3.calls.status, 401);
  } finally {
    User.findById = origFind;
  }
});

test("auth-cookie: loginUser setea cookie además del Bearer", async () => {
  const origFind = userService.findUserByNickName;
  userService.findUserByNickName = async () => ({
    _id: "u1",
    comparePassword: async () => true,
  });
  try {
    const req = { body: { nickName: "tester", password: "x" } };
    const res = mockRes();
    await userController.loginUser(req, res);
    assert.equal(res.calls.status, 200);
    assert.ok(res.calls.body.token);
    assert.equal(res.calls.cookie.length, 1);
    assert.equal(res.calls.cookie[0].name, "token");
  } finally {
    userService.findUserByNickName = origFind;
  }
});
