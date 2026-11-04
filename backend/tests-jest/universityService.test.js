jest.mock("../src/models/university", () => ({
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));
jest.mock("../src/models/career", () => ({
  exists: jest.fn(),
}));
jest.mock("../src/models/academicUnit", () => ({
  exists: jest.fn(),
}));

const University = require("../src/models/university");
const Career = require("../src/models/career");
const AcademicUnit = require("../src/models/academicUnit");
const {
  updateUniversity,
  deleteUniversity,
} = require("../src/services/universityService");

beforeEach(() => {
  jest.clearAllMocks();
});

test("updateUniversity solo envía campos de la lista blanca", async () => {
  University.findByIdAndUpdate.mockResolvedValue({ _id: "u1" });

  await updateUniversity("u1", {
    name: "UNAHUR",
    description: "Universidad",
    isArchived: true,
    _id: "otro",
    __v: 99,
  });

  expect(University.findByIdAndUpdate).toHaveBeenCalledWith(
    "u1",
    { name: "UNAHUR", description: "Universidad" },
    { new: true, runValidators: true },
  );
});

describe("deleteUniversity: guardas de integridad", () => {
  test("rechaza con 409 si hay carreras, incluidas las archivadas", async () => {
    const careerQuery = {
      setOptions: jest.fn().mockResolvedValue({ _id: "career1" }),
    };
    Career.exists.mockReturnValue(careerQuery);

    await expect(deleteUniversity("u1")).rejects.toMatchObject({
      statusCode: 409,
      message: "No se puede borrar una universidad con carreras asociadas",
    });

    expect(Career.exists).toHaveBeenCalledWith({ university: "u1" });
    expect(careerQuery.setOptions).toHaveBeenCalledWith({
      includeArchived: true,
    });
    expect(University.findByIdAndDelete).not.toHaveBeenCalled();
  });

  test("rechaza con 409 si hay institutos asociados", async () => {
    Career.exists.mockReturnValue({
      setOptions: jest.fn().mockResolvedValue(null),
    });
    AcademicUnit.exists.mockResolvedValue({ _id: "unit1" });

    await expect(deleteUniversity("u1")).rejects.toMatchObject({
      statusCode: 409,
      message: "No se puede borrar una universidad con institutos asociados",
    });

    expect(AcademicUnit.exists).toHaveBeenCalledWith({ university: "u1" });
    expect(University.findByIdAndDelete).not.toHaveBeenCalled();
  });

  test("borra la universidad si no tiene carreras ni institutos", async () => {
    Career.exists.mockReturnValue({
      setOptions: jest.fn().mockResolvedValue(null),
    });
    AcademicUnit.exists.mockResolvedValue(null);
    University.findByIdAndDelete.mockResolvedValue({ _id: "u1" });

    const result = await deleteUniversity("u1");

    expect(result).toEqual({ _id: "u1" });
    expect(University.findByIdAndDelete).toHaveBeenCalledWith("u1");
  });

  test("devuelve null si la universidad no existe", async () => {
    Career.exists.mockReturnValue({
      setOptions: jest.fn().mockResolvedValue(null),
    });
    AcademicUnit.exists.mockResolvedValue(null);
    University.findByIdAndDelete.mockResolvedValue(null);

    await expect(deleteUniversity("u1")).resolves.toBeNull();
  });
});
