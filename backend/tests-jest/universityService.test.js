jest.mock("../src/models/university", () => ({
  findByIdAndUpdate: jest.fn(),
}));
jest.mock("../src/models/career", () => ({
  exists: jest.fn(),
}));

const University = require("../src/models/university");
const { updateUniversity } = require("../src/services/universityService");

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
