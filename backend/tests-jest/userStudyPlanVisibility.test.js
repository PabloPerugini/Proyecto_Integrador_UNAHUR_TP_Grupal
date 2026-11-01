jest.mock("../src/models/studyPlan", () => ({
  findOne: jest.fn(),
}));

jest.mock("../src/models/userStudyPlan", () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../src/models/subjectProgress", () => ({
  exists: jest.fn(),
}));

const StudyPlan = require("../src/models/studyPlan");
const UserStudyPlan = require("../src/models/userStudyPlan");
const {
  addUserStudyPlan,
  getUserStudyPlans,
} = require("../src/services/userStudyPlanService");

describe("userStudyPlanService: visibilidad", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("no permite inscribirse a un plan inactivo o ajeno", async () => {
    StudyPlan.findOne.mockResolvedValue(null);

    await expect(
      addUserStudyPlan("user1", "507f1f77bcf86cd799439011"),
    ).rejects.toThrow("El plan no existe o no está disponible");

    expect(StudyPlan.findOne).toHaveBeenCalledWith({
      _id: "507f1f77bcf86cd799439011",
      isActive: { $ne: false },
      $or: [
        { createdBy: null, status: "published" },
        { createdBy: "user1" },
      ],
    });
  });

  test("el listado solo incluye planes activos y visibles", async () => {
    const populate = jest.fn().mockReturnThis();
    const sort = jest.fn().mockResolvedValue([]);
    UserStudyPlan.find.mockReturnValue({ populate, sort });

    await getUserStudyPlans("user1");

    expect(UserStudyPlan.find).toHaveBeenCalledWith({
      user: "user1",
      archivedAt: null,
    });
    expect(populate).toHaveBeenCalledWith({
      path: "studyPlan",
      match: {
        isActive: { $ne: false },
        $or: [
          { createdBy: null, status: "published" },
          { createdBy: "user1" },
        ],
      },
    });
  });
});
