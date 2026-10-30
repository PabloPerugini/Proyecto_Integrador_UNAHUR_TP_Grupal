jest.mock("../src/models/user", () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  findOneAndDelete: jest.fn(),
  updateOne: jest.fn(),
}));

const User = require("../src/models/user");
const {
  findUserByEmail,
  findUserByNickName,
} = require("../src/services/userService");

describe("búsquedas de usuario", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("findUserByNickName no consulta con un valor que no es string", async () => {
    const result = await findUserByNickName({ $ne: null });

    expect(result).toBeNull();
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test("findUserByEmail no consulta con un valor que no es string", async () => {
    const result = await findUserByEmail({ $ne: null });

    expect(result).toBeNull();
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test("findUserByNickName consulta con un string", async () => {
    User.findOne.mockResolvedValue({ nickName: "ana" });

    await findUserByNickName("ana");

    expect(User.findOne).toHaveBeenCalledWith({ nickName: "ana" });
  });
});
