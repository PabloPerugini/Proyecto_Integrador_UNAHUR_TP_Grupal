jest.mock("../src/models/studyPlan", () => ({
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

jest.mock("../src/models/planSubject", () => ({
  find: jest.fn(),
  deleteMany: jest.fn(),
}));

jest.mock("../src/models/userStudyPlan", () => ({
  find: jest.fn(),
  deleteMany: jest.fn(),
}));

jest.mock("../src/models/subjectProgress", () => ({
  deleteMany: jest.fn(),
}));

jest.mock("../src/models/planImport", () => ({
  deleteMany: jest.fn(),
}));

const StudyPlan = require("../src/models/studyPlan");
const PlanSubject = require("../src/models/planSubject");
const UserStudyPlan = require("../src/models/userStudyPlan");
const SubjectProgress = require("../src/models/subjectProgress");
const PlanImport = require("../src/models/planImport");
const { deleteStudyPlan } = require("../src/services/studyPlanService");

const selectResult = (value) => ({
  select: jest.fn().mockResolvedValue(value),
});

describe("deleteStudyPlan: reverificación de permisos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserStudyPlan.find.mockReturnValue(selectResult([]));
    PlanSubject.find.mockReturnValue(selectResult([]));
    UserStudyPlan.deleteMany.mockResolvedValue({ deletedCount: 0 });
    SubjectProgress.deleteMany.mockResolvedValue({ deletedCount: 0 });
    PlanImport.deleteMany.mockResolvedValue({ deletedCount: 0 });
    PlanSubject.deleteMany.mockResolvedValue({ deletedCount: 0 });
    StudyPlan.findByIdAndDelete.mockResolvedValue({ _id: "plan1" });
  });

  test("no borra un plan ajeno aunque se llame al servicio directamente", async () => {
    StudyPlan.findById.mockResolvedValue({
      _id: "plan1",
      createdBy: "owner1",
    });

    const result = await deleteStudyPlan("plan1", {
      _id: "intruder1",
      rol: "USUARIO",
    });

    expect(result).toBeNull();
    expect(UserStudyPlan.find).not.toHaveBeenCalled();
    expect(StudyPlan.findByIdAndDelete).not.toHaveBeenCalled();
  });

  test("no borra un plan oficial si el solicitante no es ADMIN", async () => {
    StudyPlan.findById.mockResolvedValue({
      _id: "plan1",
      createdBy: null,
    });

    const result = await deleteStudyPlan("plan1", {
      _id: "user1",
      rol: "USUARIO",
    });

    expect(result).toBeNull();
    expect(StudyPlan.findByIdAndDelete).not.toHaveBeenCalled();
  });

  test("un ADMIN puede borrar y la cascada elimina hijos antes que el plan", async () => {
    StudyPlan.findById.mockResolvedValue({
      _id: "plan1",
      createdBy: "owner1",
    });
    PlanSubject.find.mockReturnValue(selectResult([{ _id: "subject1" }]));

    const result = await deleteStudyPlan("plan1", {
      _id: "admin1",
      rol: "ADMIN",
    });

    expect(result.deleted).toBe(true);
    expect(SubjectProgress.deleteMany).toHaveBeenCalledWith({
      planSubject: { $in: ["subject1"] },
    });
    expect(UserStudyPlan.deleteMany).toHaveBeenCalledWith({
      studyPlan: "plan1",
    });
    expect(PlanSubject.deleteMany).toHaveBeenCalledWith({
      studyPlan: "plan1",
    });
    expect(PlanImport.deleteMany).toHaveBeenCalledWith({
      studyPlan: "plan1",
    });
    expect(StudyPlan.findByIdAndDelete).toHaveBeenCalledWith("plan1");
  });
});
