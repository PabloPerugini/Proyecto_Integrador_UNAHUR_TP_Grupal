jest.mock("../src/models/userStudyPlan", () => ({
  findOne: jest.fn(),
}));

jest.mock("../src/models/studyPlan", () => ({
  findOne: jest.fn(),
}));

jest.mock("../src/models/subjectProgress", () => ({
  find: jest.fn(),
}));

jest.mock("../src/models/planSubject", () => ({
  findOne: jest.fn(),
}));

const UserStudyPlan = require("../src/models/userStudyPlan");
const StudyPlan = require("../src/models/studyPlan");
const SubjectProgress = require("../src/models/subjectProgress");
const {
  getSubjectProgress,
} = require("../src/services/subjectProgressService");

describe("getSubjectProgress: visibilidad del plan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("ignora inscripciones archivadas", async () => {
    UserStudyPlan.findOne.mockResolvedValue(null);

    await expect(
      getSubjectProgress("user1", "enrollment1"),
    ).rejects.toThrow("El usuario no tiene acceso a este plan");

    expect(UserStudyPlan.findOne).toHaveBeenCalledWith({
      _id: "enrollment1",
      user: "user1",
      archivedAt: null,
    });
  });

  test("rechaza el progreso si el plan está inactivo", async () => {
    UserStudyPlan.findOne.mockResolvedValue({
      _id: "enrollment1",
      studyPlan: "plan1",
    });
    StudyPlan.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await expect(
      getSubjectProgress("user1", "enrollment1"),
    ).rejects.toThrow("El usuario no tiene acceso a este plan");

    expect(StudyPlan.findOne).toHaveBeenCalledWith({
      _id: "plan1",
      isActive: { $ne: false },
      $or: [
        { createdBy: null, status: "published" },
        { createdBy: "user1" },
      ],
    });
    expect(SubjectProgress.find).not.toHaveBeenCalled();
  });
});
