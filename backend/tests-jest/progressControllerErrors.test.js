jest.mock("../src/services/pdfParser.service", () => ({
  parseAcademicHistory: jest.fn(),
}));

const { parseAcademicHistory } = require("../src/services/pdfParser.service");
const { parseHistory } = require("../src/controllers/progress.controllers");

const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe("progress.controllers: errores sin detalles internos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("el fallo de parseo no expone el error interno del parser", async () => {
    parseAcademicHistory.mockRejectedValue(new Error("stack interno del parser"));
    const next = jest.fn();

    await parseHistory(
      { file: { buffer: Buffer.from("pdf") } },
      response(),
      next,
    );

    const error = next.mock.calls[0][0];
    expect(error.status).toBe(400);
    expect(error.message).toBe(
      "No se pudo leer el PDF. Asegurate de que sea un PDF con texto (no escaneado).",
    );
    expect(error.details).toBeUndefined();
  });
});
