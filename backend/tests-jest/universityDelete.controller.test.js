jest.mock("../src/services/universityService", () => ({
  deleteUniversity: jest.fn(),
}));

const universityService = require("../src/services/universityService");
const {
  deleteUniversity,
} = require("../src/controllers/university.controllers");

const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe("university.controllers.deleteUniversity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("200 cuando la universidad se elimina", async () => {
    universityService.deleteUniversity.mockResolvedValue({ _id: "u1" });
    const res = response();

    await deleteUniversity({ params: { id: "u1" } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Universidad eliminada correctamente",
    });
  });

  test("404 cuando la universidad no existe", async () => {
    universityService.deleteUniversity.mockResolvedValue(null);
    const res = response();

    await deleteUniversity({ params: { id: "u1" } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Universidad no encontrada",
    });
  });

  test("409 cuando hay dependencias y el servicio lo informa", async () => {
    const error = new Error(
      "No se puede borrar una universidad con institutos asociados",
    );
    error.statusCode = 409;
    universityService.deleteUniversity.mockRejectedValue(error);
    const res = response();

    await deleteUniversity({ params: { id: "u1" } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "No se puede borrar una universidad con institutos asociados",
    });
  });

  test("500 sin filtrar el error interno", async () => {
    universityService.deleteUniversity.mockRejectedValue(
      new Error("mongodb://usuario:clave@host"),
    );
    const res = response();

    await deleteUniversity({ params: { id: "u1" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Error al eliminar la universidad",
    });
  });
});
