jest.mock("../src/services/studyPlanService", () => ({
  getIntermediateView: jest.fn(),
}));

jest.mock("../src/services/studyPlanGraph.service", () => ({
  getGraphData: jest.fn(),
  getSugerenciasData: jest.fn(),
}));

const mongoose = require("mongoose");
const { getGraphData } = require("../src/services/studyPlanGraph.service");
const { getGraph } = require("../src/controllers/studyPlan.controllers");

const PLAN_ID = new mongoose.Types.ObjectId().toString();

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

describe("GET /study-plans/:id/graph", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getGraphData.mockResolvedValue({ title: "Plan" });
  });

  test("pasa el target string al servicio", async () => {
    const res = crearRes();

    await getGraph(
      { params: { id: PLAN_ID }, query: { target: "ABC123" }, user: { _id: "u1" } },
      res,
    );

    expect(getGraphData).toHaveBeenCalledWith(PLAN_ID, "u1", { target: "ABC123" });
    expect(res.statusCode).toBe(200);
  });

  test("ignora un target que no es string", async () => {
    const res = crearRes();

    await getGraph(
      { params: { id: PLAN_ID }, query: { target: ["A", "B"] }, user: { _id: "u1" } },
      res,
    );

    expect(getGraphData).toHaveBeenCalledWith(PLAN_ID, "u1", { target: null });
  });
});
