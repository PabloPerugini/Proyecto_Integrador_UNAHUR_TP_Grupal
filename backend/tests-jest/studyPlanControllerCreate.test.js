jest.mock("../src/services/studyPlanService", () => ({
  createStudyPlan: jest.fn(),
}));

jest.mock("../src/services/studyPlanGraph.service", () => ({
  getGraphData: jest.fn(),
  getSugerenciasData: jest.fn(),
}));

const studyPlanService = require("../src/services/studyPlanService");
const { createStudyPlan } = require("../src/controllers/studyPlan.controllers");

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

describe("POST /study-plans", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    studyPlanService.createStudyPlan.mockResolvedValue({ _id: "plan1" });
  });

  test("un ADMIN crea un plan oficial e ignora createdBy/status del body", async () => {
    const res = crearRes();

    await createStudyPlan(
      {
        body: {
          name: "Plan 2026",
          career: "carrera1",
          createdBy: "otro-usuario",
          status: "draft",
        },
        user: { _id: "admin1", rol: "ADMIN" },
      },
      res,
    );

    expect(studyPlanService.createStudyPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Plan 2026",
        career: "carrera1",
        createdBy: null,
        status: "published",
      }),
    );
    expect(res.statusCode).toBe(201);
  });
});
