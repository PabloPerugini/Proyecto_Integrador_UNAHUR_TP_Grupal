const errorHandler = require("../src/middlewares/errorHandler");
const AppError = require("../src/utils/AppError");

const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe("errorHandler: status y mensajes seguros", () => {
  test("respeta err.status sin filtrar el mensaje interno", () => {
    const res = response();

    errorHandler(
      { status: 403, message: "token interno filtrado" },
      {},
      res,
      jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Error en la solicitud",
    });
  });

  test("traduce el cuerpo demasiado grande a un 413 claro", () => {
    const res = response();

    errorHandler(
      { status: 413, message: "request entity too large" },
      {},
      res,
      jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      message: "El cuerpo de la solicitud es demasiado grande",
    });
  });

  test("conserva el mensaje de un AppError explícito", () => {
    const res = response();

    errorHandler(
      new AppError(422, "El plan no se puede guardar"),
      {},
      res,
      jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      message: "El plan no se puede guardar",
    });
  });
});
