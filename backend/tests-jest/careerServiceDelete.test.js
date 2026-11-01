jest.mock("../src/models/career", () => ({
  findByIdAndDelete: jest.fn(),
}));

jest.mock("../src/models/studyPlan", () => ({
  exists: jest.fn(),
}));

const Career = require("../src/models/career");
const StudyPlan = require("../src/models/studyPlan");
const { deleteCareer } = require("../src/services/careerService");

describe("deleteCareer: carreras archivadas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    StudyPlan.exists.mockResolvedValue(false);
  });

  test("incluye las archivadas al borrar para que el hook no las oculte", async () => {
    const query = {
      setOptions: jest.fn().mockResolvedValue({ _id: "career1" }),
    };
    Career.findByIdAndDelete.mockReturnValue(query);

    const result = await deleteCareer("career1");

    expect(Career.findByIdAndDelete).toHaveBeenCalledWith("career1");
    expect(query.setOptions).toHaveBeenCalledWith({
      includeArchived: true,
    });
    expect(result).toEqual({ _id: "career1" });
  });
});
