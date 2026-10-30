jest.mock("../src/models/studyPlan", () => ({
  create: jest.fn(),
}));

jest.mock("../src/models/career", () => ({
  findById: jest.fn(),
}));

const StudyPlan = require("../src/models/studyPlan");
const Career = require("../src/models/career");
const { createStudyPlan } = require("../src/services/studyPlanService");

describe("createStudyPlan: planes oficiales", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Career.findById.mockResolvedValue({ _id: "carrera1" });
    StudyPlan.create.mockImplementation(async (data) => ({ _id: "plan1", ...data }));
  });

  test("acepta createdBy null con status published", async () => {
    await createStudyPlan({
      name: "Plan oficial",
      career: "carrera1",
      createdBy: null,
      status: "published",
    });

    expect(StudyPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: null, status: "published" }),
    );
  });

  test("rechaza un plan sin creador que no es oficial", async () => {
    await expect(
      createStudyPlan({
        name: "Plan huérfano",
        career: "carrera1",
      }),
    ).rejects.toThrow("El usuario creador del plan es obligatorio");

    expect(StudyPlan.create).not.toHaveBeenCalled();
  });

  test("un plan con creador sigue siendo personal y borrador", async () => {
    await createStudyPlan({
      name: "Plan personal",
      career: "carrera1",
      createdBy: "usuario1",
    });

    expect(StudyPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: "usuario1", status: "draft" }),
    );
  });
});
