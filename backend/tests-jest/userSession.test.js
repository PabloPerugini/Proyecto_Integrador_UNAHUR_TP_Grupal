process.env.JWT_SECRET = "test-secret";

jest.mock("../src/services/userService", () => ({
  bumpTokenVersion: jest.fn(),
}));

jest.mock("../src/services/cache.service", () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
}));

const userService = require("../src/services/userService");
const cacheService = require("../src/services/cache.service");
const { signToken, getUserId } = require("../src/middlewares/auth");
const {
  getMe,
  logoutUser,
} = require("../src/controllers/user.controllers");

const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  clearCookie: jest.fn(),
});

describe("sesión: Bearer, logout y perfil", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getUserId acepta el token del header Authorization", () => {
    const token = signToken("user1", 3);

    expect(
      getUserId({
        headers: { authorization: `Bearer ${token}` },
        cookies: {},
      }),
    ).toBe("user1");
  });

  test("getUserId sigue aceptando la cookie httpOnly", () => {
    const token = signToken("user1", 0);

    expect(
      getUserId({
        headers: {},
        cookies: { token },
      }),
    ).toBe("user1");
  });

  test("logout con Bearer sube tokenVersion y limpia la cookie", async () => {
    const token = signToken("user1", 0);
    const res = response();

    await logoutUser(
      {
        headers: { authorization: `Bearer ${token}` },
        cookies: {},
      },
      res,
    );

    expect(userService.bumpTokenVersion).toHaveBeenCalledWith("user1");
    expect(res.clearCookie).toHaveBeenCalledWith("token", { path: "/" });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("getMe devuelve el usuario actual sin caché", async () => {
    const user = { _id: "user1", nickName: "ana" };
    const res = response();

    await getMe({ user, userId: "user1" }, res);

    expect(cacheService.getCache).not.toHaveBeenCalled();
    expect(cacheService.setCache).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(user);
  });
});
