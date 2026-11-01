jest.mock("../src/models/planSubject", () => ({
  find: jest.fn(),
}));

jest.mock("../src/models/userStudyPlan", () => ({
  findOne: jest.fn(),
}));

jest.mock("../src/models/subjectProgress", () => ({
  find: jest.fn(),
}));

const PlanSubject = require("../src/models/planSubject");
const UserStudyPlan = require("../src/models/userStudyPlan");
const SubjectProgress = require("../src/models/subjectProgress");
const { loadPlanData } = require("../src/services/studyPlanGraph.service");

const academicDate = new Date("2025-03-01T00:00:00.000Z");
const createdAt = new Date("2025-02-01T00:00:00.000Z");

function mockPlan(items) {
  PlanSubject.find.mockReturnValue({
    populate: () => ({ lean: async () => items }),
  });
}

function mockProgress(rows) {
  UserStudyPlan.findOne.mockResolvedValue({ _id: "enrollment1" });
  SubjectProgress.find.mockReturnValue({ lean: async () => rows });
}

describe("loadPlanData: fechas de progreso", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlan([
      {
        _id: "ps1",
        code: "MAT001",
        subject: { name: "Álgebra" },
        prerequisites: [],
      },
    ]);
  });

  test("mapea academicDate como fecha y conserva createdAt", async () => {
    mockProgress([
      {
        planSubject: "ps1",
        status: "APROBADA",
        grade: 8,
        academicDate,
        createdAt,
      },
    ]);

    const { progress } = await loadPlanData("plan1", "user1");

    expect(progress).toEqual([
      {
        subjectCode: "MAT001",
        status: "Aprobada",
        nota: 8,
        fecha: academicDate,
        createdAt,
      },
    ]);
  });

  test("sin fecha académica deja fecha null y mantiene createdAt", async () => {
    mockProgress([
      {
        planSubject: "ps1",
        status: "CURSANDO",
        grade: null,
        academicDate: null,
        createdAt,
      },
    ]);

    const { progress } = await loadPlanData("plan1", "user1");

    expect(progress[0].fecha).toBeNull();
    expect(progress[0].createdAt).toBe(createdAt);
  });

  test("ignora inscripciones archivadas al cargar progreso", async () => {
    UserStudyPlan.findOne.mockResolvedValue(null);

    const { progress } = await loadPlanData("plan1", "user1");

    expect(UserStudyPlan.findOne).toHaveBeenCalledWith({
      user: "user1",
      studyPlan: "plan1",
      archivedAt: null,
    });
    expect(progress).toEqual([]);
    expect(SubjectProgress.find).not.toHaveBeenCalled();
  });
});
