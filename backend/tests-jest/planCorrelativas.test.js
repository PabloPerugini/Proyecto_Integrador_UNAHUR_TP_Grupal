jest.mock("../src/models/planSubject", () => ({
  find: jest.fn(),
  bulkWrite: jest.fn(),
}));

jest.mock("../src/services/pdfParser.service", () => ({
  parseCorrelativas: jest.fn(),
}));

const PlanSubject = require("../src/models/planSubject");
const { saveCorrelativas } = require("../src/services/planCorrelativas.service");

const planId = "plan1";
const idA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const idB = "bbbbbbbbbbbbbbbbbbbbbbbb";
const idC = "cccccccccccccccccccccccc";

function mockItems(items) {
  PlanSubject.find.mockReturnValue({
    select: () => ({ lean: async () => items }),
  });
}

function savedPrerequisites() {
  return PlanSubject.bulkWrite.mock.calls[0][0][0].updateOne.update.$set
    .prerequisites;
}

describe("saveCorrelativas: requiredStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PlanSubject.bulkWrite.mockResolvedValue({});
  });

  test("conserva APROBADA en una correlativa que ya lo requería", async () => {
    mockItems([
      { _id: idA, code: "A", prerequisites: [] },
      {
        _id: idB,
        code: "B",
        prerequisites: [{ planSubject: idA, requiredStatus: "APROBADA" }],
      },
    ]);

    await saveCorrelativas(planId, [{ code: "B", requires: ["A"] }]);

    expect(savedPrerequisites()).toEqual([
      { planSubject: idA, requiredStatus: "APROBADA" },
    ]);
  });

  test("una correlativa nueva usa REGULARIZADA", async () => {
    mockItems([
      { _id: idA, code: "A", prerequisites: [] },
      { _id: idB, code: "B", prerequisites: [] },
    ]);

    await saveCorrelativas(planId, [{ code: "B", requires: ["A"] }]);

    expect(savedPrerequisites()).toEqual([
      { planSubject: idA, requiredStatus: "REGULARIZADA" },
    ]);
  });

  test("conserva el estado de cada requisito por separado", async () => {
    mockItems([
      { _id: idA, code: "A", prerequisites: [] },
      { _id: idC, code: "C", prerequisites: [] },
      {
        _id: idB,
        code: "B",
        prerequisites: [
          { planSubject: idA, requiredStatus: "APROBADA" },
          { planSubject: idC, requiredStatus: "REGULARIZADA" },
        ],
      },
    ]);

    await saveCorrelativas(planId, [{ code: "B", requires: ["A", "C"] }]);

    expect(savedPrerequisites()).toEqual([
      { planSubject: idA, requiredStatus: "APROBADA" },
      { planSubject: idC, requiredStatus: "REGULARIZADA" },
    ]);
  });
});
