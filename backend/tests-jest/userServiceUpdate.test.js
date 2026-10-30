jest.mock("../src/models/user", () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  findOneAndDelete: jest.fn(),
  updateOne: jest.fn(),
}));

const User = require("../src/models/user");
const { updateUser } = require("../src/services/userService");

function mockUser(overrides = {}) {
  const user = {
    nickName: "ana",
    email: "ana@example.com",
    password: "hash-viejo",
    tokenVersion: 2,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  User.findOne.mockResolvedValue(user);
  return user;
}

describe("updateUser: cambio de contraseña", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("subir tokenVersion invalida las sesiones vigentes", async () => {
    const user = mockUser();

    await updateUser("ana", { password: "nueva-clave" });

    expect(user.password).toBe("nueva-clave");
    expect(user.tokenVersion).toBe(3);
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  test("sin contraseña no se toca tokenVersion", async () => {
    const user = mockUser();

    await updateUser("ana", { firstName: "Ana María" });

    expect(user.firstName).toBe("Ana María");
    expect(user.tokenVersion).toBe(2);
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  test("un usuario viejo sin tokenVersion arranca en 1", async () => {
    const user = mockUser({ tokenVersion: undefined });

    await updateUser("ana", { password: "nueva-clave" });

    expect(user.tokenVersion).toBe(1);
  });
});
