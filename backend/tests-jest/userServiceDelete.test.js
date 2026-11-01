jest.mock("../src/models/user", () => ({
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
}));

jest.mock("../src/models/studyPlan", () => ({
  find: jest.fn(),
  deleteMany: jest.fn(),
}));

jest.mock("../src/models/userStudyPlan", () => ({
  find: jest.fn(),
  deleteMany: jest.fn(),
}));

jest.mock("../src/models/planSubject", () => ({
  find: jest.fn(),
  deleteMany: jest.fn(),
}));

jest.mock("../src/models/subjectProgress", () => ({
  deleteMany: jest.fn(),
}));

jest.mock("../src/models/planImport", () => ({
  deleteMany: jest.fn(),
}));

const User = require("../src/models/user");
const StudyPlan = require("../src/models/studyPlan");
const UserStudyPlan = require("../src/models/userStudyPlan");
const PlanSubject = require("../src/models/planSubject");
const SubjectProgress = require("../src/models/subjectProgress");
const PlanImport = require("../src/models/planImport");
const { deleteUser } = require("../src/services/userService");

const selectResult = (value) => ({
  select: jest.fn().mockResolvedValue(value),
});

describe("deleteUser: cascada de datos académicos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne.mockResolvedValue({ _id: "user1", nickName: "ana" });
    User.findOneAndDelete.mockResolvedValue({ _id: "user1" });
    UserStudyPlan.find.mockReturnValue(selectResult([{ _id: "enrollment1" }]));
    StudyPlan.find.mockReturnValue(selectResult([{ _id: "plan1" }]));
    PlanSubject.find.mockReturnValue(selectResult([{ _id: "subject1" }]));
    SubjectProgress.deleteMany.mockResolvedValue({ deletedCount: 1 });
    UserStudyPlan.deleteMany.mockResolvedValue({ deletedCount: 1 });
    PlanImport.deleteMany.mockResolvedValue({ deletedCount: 1 });
    PlanSubject.deleteMany.mockResolvedValue({ deletedCount: 1 });
    StudyPlan.deleteMany.mockResolvedValue({ deletedCount: 1 });
  });

  test("borra progreso, inscripciones, importaciones, materias y planes privados", async () => {
    const result = await deleteUser("ana");

    expect(result).toEqual({ _id: "user1" });
    expect(SubjectProgress.deleteMany).toHaveBeenCalledWith({
      $or: [
        { userStudyPlan: { $in: ["enrollment1"] } },
        { planSubject: { $in: ["subject1"] } },
      ],
    });
    expect(UserStudyPlan.deleteMany).toHaveBeenCalledWith({
      $or: [
        { user: "user1" },
        { studyPlan: { $in: ["plan1"] } },
      ],
    });
    expect(PlanImport.deleteMany).toHaveBeenCalledWith({
      $or: [
        { user: "user1" },
        { studyPlan: { $in: ["plan1"] } },
      ],
    });
    expect(PlanSubject.deleteMany).toHaveBeenCalledWith({
      studyPlan: { $in: ["plan1"] },
    });
    expect(StudyPlan.deleteMany).toHaveBeenCalledWith({
      createdBy: "user1",
    });
    expect(User.findOneAndDelete).toHaveBeenCalledWith({ _id: "user1" });
  });

  test("no toca datos académicos si el usuario no existe", async () => {
    User.findOne.mockResolvedValue(null);

    const result = await deleteUser("nadie");

    expect(result).toBeNull();
    expect(UserStudyPlan.deleteMany).not.toHaveBeenCalled();
    expect(User.findOneAndDelete).not.toHaveBeenCalled();
  });
});
