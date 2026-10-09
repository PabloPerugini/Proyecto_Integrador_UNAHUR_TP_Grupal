
const Career = require("../models/career");
const University = require("../models/university");
const AcademicUnit = require("../models/academicUnit");
const StudyPlan = require("../models/studyPlan");

// Validar universidad y unidad académica
const validateCareerRelations = async (
  universityId,
  academicUnitId
) => {
  const university = await University.findById(universityId);

  if (!university) {
    throw new Error("La universidad no existe");
  }

  if (academicUnitId) {
    const academicUnit = await AcademicUnit.findById(
      academicUnitId
    );

    if (!academicUnit) {
      throw new Error("La unidad académica no existe");
    }

    if (
      academicUnit.university.toString() !==
      university._id.toString()
    ) {
      throw new Error(
        "La unidad académica no pertenece a esa universidad"
      );
    }
  }
};

// Obtener todas las carreras
const getAllCareers = async () => {
  return Career.find()
    .populate("university")
    .populate("academicUnit");
};

// Obtener una carrera por ID
const findCareerById = async (id) => {
  return Career.findById(id)
    .populate("university")
    .populate("academicUnit");
};

// Crear una carrera
const createCareer = async (careerData) => {
  await validateCareerRelations(
    careerData.university,
    careerData.academicUnit
  );

  return Career.create({
    name: careerData.name,
    description: careerData.description,
    university: careerData.university,
    academicUnit: careerData.academicUnit || null,
    color: careerData.color,
  });
};

// Actualizar una carrera
const updateCareer = async (id, careerData) => {
  const career = await Career.findById(id);

  if (!career) return null;

  // Comprobar que las relaciones sigan siendo válidas
  const universityId =
    careerData.university !== undefined
      ? careerData.university
      : career.university;

  const academicUnitId =
    careerData.academicUnit !== undefined
      ? careerData.academicUnit
      : career.academicUnit;

  if (
    careerData.university !== undefined ||
    careerData.academicUnit !== undefined
  ) {
    await validateCareerRelations(
      universityId,
      academicUnitId
    );
  }

  // Actualizar solamente los campos permitidos
  if (careerData.name !== undefined) {
    career.name = careerData.name;
  }

  if (careerData.description !== undefined) {
    career.description = careerData.description;
  }

  if (careerData.university !== undefined) {
    career.university = careerData.university;
  }

  if (careerData.academicUnit !== undefined) {
    career.academicUnit = careerData.academicUnit;
  }

  if (careerData.color !== undefined) {
    career.color = careerData.color;
  }

  await career.save();

  await career.populate([
    "university",
    "academicUnit",
  ]);

  return career;
};

// Eliminar una carrera
const deleteCareer = async (id) => {
  if (await StudyPlan.exists({ career: id })) {
    const error = new Error("No se puede borrar una carrera que tiene planes de estudio");
    error.statusCode = 409;
    throw error;
  }
  return Career.findByIdAndDelete(id);
};

module.exports = {
  getAllCareers,
  findCareerById,
  createCareer,
  updateCareer,
  deleteCareer,
};
