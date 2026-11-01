jest.mock("../src/models/studyPlan", () => ({
  findOne: jest.fn(),
}));

const StudyPlan = require("../src/models/studyPlan");
const authStudyPlanViewer = require("../src/middlewares/authStudyPlanViewer");

const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

const request = (rol = "USUARIO") => ({
  params: { id: "plan1" },
  user: { _id: "user1", rol },
});

describe("authStudyPlanViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("un usuario común consulta el plan con el filtro de visibilidad", async () => {
    StudyPlan.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });
    const res = response();
    const next = jest.fn();

    await authStudyPlanViewer(request(), res, next);

    expect(StudyPlan.findOne).toHaveBeenCalledWith({
      _id: "plan1",
      isActive: { $ne: false },
      $or: [
        { createdBy: null, status: "published" },
        { createdBy: "user1" },
      ],
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  test("un ADMIN consulta el plan sin filtro adicional", async () => {
    StudyPlan.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: "plan1" }),
    });
    const res = response();
    const next = jest.fn();

    await authStudyPlanViewer(request("ADMIN"), res, next);

    expect(StudyPlan.findOne).toHaveBeenCalledWith({ _id: "plan1" });
    expect(next).toHaveBeenCalled();
  });
});
