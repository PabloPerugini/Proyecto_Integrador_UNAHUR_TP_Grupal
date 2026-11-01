jest.mock("../src/models/planSubject", () => ({
  countDocuments: jest.fn(),
  updateMany: jest.fn(),
}));

const PlanSubject = require("../src/models/planSubject");
const { bulkSetIntermediate } = require("../src/services/planSubjectService");

describe("bulkSetIntermediate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PlanSubject.countDocuments.mockResolvedValue(0);
    PlanSubject.updateMany.mockResolvedValue({ matchedCount: 0 });
  });

  test("rechaza el lote si no se envían ids", async () => {
    await expect(
      bulkSetIntermediate("plan1", { intermediate: true }),
    ).rejects.toThrow("Elegí al menos una materia");

    expect(PlanSubject.updateMany).not.toHaveBeenCalled();
  });

  test("rechaza el lote si ids está vacío", async () => {
    await expect(
      bulkSetIntermediate("plan1", { ids: [], intermediate: false }),
    ).rejects.toThrow("Elegí al menos una materia");

    expect(PlanSubject.updateMany).not.toHaveBeenCalled();
  });

  test("aplica solo a los ids elegidos", async () => {
    const ids = ["507f1f77bcf86cd799439011"];

    await bulkSetIntermediate("plan1", {
      ids,
      intermediate: true,
    });

    expect(PlanSubject.updateMany).toHaveBeenCalledWith(
      { studyPlan: "plan1", _id: { $in: ids } },
      { $set: { intermediate: true } },
    );
  });
});
