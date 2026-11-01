jest.mock("../src/services/careerService", () => ({
  createCareer: jest.fn(),
  updateCareer: jest.fn(),
}));

const careerService = require("../src/services/careerService");
const {
  createCareer,
  updateCareer,
} = require("../src/controllers/career.controllers");

const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe("career.controllers: errores sin detalles internos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("crear una carrera no filtra el error crudo del servicio", async () => {
    careerService.createCareer.mockRejectedValue(
      new Error("mongodb://usuario:clave@host"),
    );
    const res = response();

    await createCareer({ body: { name: "Nueva" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "No se pudo crear la carrera",
    });
  });

  test("crear una carrera muestra solo los errores de validación expuestos", async () => {
    const error = new Error("La universidad no existe");
    error.statusCode = 400;
    error.expose = true;
    careerService.createCareer.mockRejectedValue(error);
    const res = response();

    await createCareer({ body: { name: "Nueva" } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "La universidad no existe",
    });
  });

  test("un duplicado responde 409 con mensaje genérico", async () => {
    const error = new Error("E11000 duplicate key");
    error.code = 11000;
    careerService.createCareer.mockRejectedValue(error);
    const res = response();

    await createCareer({ body: { name: "Repetida" } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Ya existe una carrera con esos datos",
    });
  });

  test("actualizar una carrera no filtra el error crudo del servicio", async () => {
    careerService.updateCareer.mockRejectedValue(
      new Error("stack trace interno"),
    );
    const res = response();

    await updateCareer({ params: { id: "c1" }, body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "No se pudo actualizar la carrera",
    });
  });
});
