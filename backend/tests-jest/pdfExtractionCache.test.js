jest.mock("../src/models/pdfExtractionCache", () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
}));

const PdfExtractionCache = require("../src/models/pdfExtractionCache");
const {
  preparePdfExtraction,
} = require("../src/services/pdfExtractionCacheService");

const pdf = Buffer.from("%PDF-1.4\ncontenido de prueba\n");
const MINUTE = 60 * 1000;

describe("preparePdfExtraction: lock de procesamiento", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("un PROCESANDO viejo se reclama y se reprocesa", async () => {
    PdfExtractionCache.findOne.mockResolvedValueOnce({
      _id: "cache1",
      status: "PROCESANDO",
      updatedAt: new Date(Date.now() - 11 * MINUTE),
    });
    PdfExtractionCache.findOneAndUpdate.mockResolvedValue({
      _id: "cache1",
      status: "PROCESANDO",
    });

    const state = await preparePdfExtraction(pdf);

    expect(state.action).toBe("PARSE");
    expect(PdfExtractionCache.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PROCESANDO",
        updatedAt: expect.objectContaining({ $lt: expect.any(Date) }),
      }),
      expect.anything(),
      expect.objectContaining({ new: true }),
    );
  });

  test("un PROCESANDO reciente sigue en espera sin reclamar", async () => {
    PdfExtractionCache.findOne.mockResolvedValueOnce({
      _id: "cache1",
      status: "PROCESANDO",
      updatedAt: new Date(Date.now() - 2 * MINUTE),
    });

    const state = await preparePdfExtraction(pdf);

    expect(state.action).toBe("WAIT");
    expect(PdfExtractionCache.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("si otro reclama primero, el perdedor vuelve a esperar", async () => {
    PdfExtractionCache.findOne
      .mockResolvedValueOnce({
        _id: "cache1",
        status: "PROCESANDO",
        updatedAt: new Date(Date.now() - 11 * MINUTE),
      })
      .mockResolvedValueOnce({
        _id: "cache1",
        status: "PROCESANDO",
        updatedAt: new Date(),
      });
    PdfExtractionCache.findOneAndUpdate.mockResolvedValue(null);

    const state = await preparePdfExtraction(pdf);

    expect(state.action).toBe("WAIT");
  });

  test("un PROCESANDO sin updatedAt no bloquea para siempre", async () => {
    PdfExtractionCache.findOne.mockResolvedValueOnce({
      _id: "cache1",
      status: "PROCESANDO",
    });
    PdfExtractionCache.findOneAndUpdate.mockResolvedValue({
      _id: "cache1",
      status: "PROCESANDO",
    });

    const state = await preparePdfExtraction(pdf);

    expect(state.action).toBe("PARSE");
    expect(PdfExtractionCache.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PROCESANDO" }),
      expect.anything(),
      expect.objectContaining({ new: true }),
    );
  });

  test("una extracción completada se reutiliza", async () => {
    PdfExtractionCache.findOne.mockResolvedValueOnce({
      _id: "cache1",
      status: "COMPLETADA",
      result: { subjects: [{ name: "Álgebra" }] },
    });

    const state = await preparePdfExtraction(pdf);

    expect(state.action).toBe("REUSE");
    expect(state.result).toEqual({ subjects: [{ name: "Álgebra" }] });
    expect(PdfExtractionCache.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("un ERROR previo se reintenta", async () => {
    PdfExtractionCache.findOne.mockResolvedValueOnce({
      _id: "cache1",
      status: "ERROR",
    });
    PdfExtractionCache.findOneAndUpdate.mockResolvedValue({
      _id: "cache1",
      status: "PROCESANDO",
    });

    const state = await preparePdfExtraction(pdf);

    expect(state.action).toBe("PARSE");
  });
});
