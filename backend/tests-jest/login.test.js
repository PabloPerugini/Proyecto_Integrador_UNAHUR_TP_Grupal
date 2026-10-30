process.env.JWT_SECRET = "secreto-de-prueba-largo-1234";

jest.mock("../src/services/userService", () => ({
  findUserByNickName: jest.fn(),
}));

const userService = require("../src/services/userService");
const { loginUser } = require("../src/controllers/user.controllers");

function crearRes() {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
}

describe("loginUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rechaza un nickName que no es string sin consultar la base", async () => {
    const res = crearRes();

    await loginUser(
      { body: { nickName: { $ne: null }, password: "secreta" } },
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(userService.findUserByNickName).not.toHaveBeenCalled();
  });

  test("rechaza un password que no es string sin consultar la base", async () => {
    const res = crearRes();

    await loginUser(
      { body: { nickName: "ana", password: { $ne: null } } },
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(userService.findUserByNickName).not.toHaveBeenCalled();
  });

  test("con credenciales string sigue el flujo normal", async () => {
    const user = {
      _id: "64b000000000000000000001",
      tokenVersion: 0,
      comparePassword: jest.fn().mockResolvedValue(true),
    };
    userService.findUserByNickName.mockResolvedValue(user);
    const res = crearRes();

    await loginUser({ body: { nickName: "ana", password: "secreta" } }, res);

    expect(userService.findUserByNickName).toHaveBeenCalledWith("ana");
    expect(res.statusCode).toBe(200);
    expect(typeof res.body.token).toBe("string");
  });
});
