
const Career = require("../models/career");
const University = require("../models/university");
const AcademicUnit = require("../models/academicUnit");
const StudyPlan = require("../models/studyPlan");
const mongoose = require("mongoose");

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

// Obtener todas las carreras (filtros F1; archivadas solo con opt-in).
const getAllCareers = async ({ unit, includeArchived } = {}) => {
  const query = Career.find();

  // Compat: valores no-ObjectId (ej. "published" legado) se ignoran.
  if (unit && mongoose.isValidObjectId(unit)) {
    query.where({ academicUnit: unit });
  }

  if (includeArchived) {
    query.setOptions({ includeArchived: true });
  }

  return query.populate("university").populate("academicUnit");
};

// Obtener una carrera por ID (archivadas solo con opt-in).
const findCareerById = async (id, { includeArchived } = {}) => {
  const query = Career.findById(id);

  if (includeArchived) {
    query.setOptions({ includeArchived: true });
  }

  return query.populate("university").populate("academicUnit");
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

// Actualizar una carrera (rutas admin: ve archivadas para desarchivar).
const updateCareer = async (id, careerData) => {
  const career = await Career.findById(id).setOptions({
    includeArchived: true,
  });

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

  // Actualizar solamente los campos permitidos (set parcial: no revalida
  // el documento entero, así se puede desarchivar basura vieja sin university).
  const updateData = {};

  if (careerData.name !== undefined) {
    updateData.name = careerData.name;
  }

  if (careerData.description !== undefined) {
    updateData.description = careerData.description;
  }

  if (careerData.university !== undefined) {
    updateData.university = careerData.university;
  }

  if (careerData.academicUnit !== undefined) {
    updateData.academicUnit = careerData.academicUnit;
  }

  if (careerData.color !== undefined) {
    updateData.color = careerData.color;
  }

  // Archivar/desarchivar (rutas admin).
  if (careerData.isArchived !== undefined) {
    updateData.isArchived = Boolean(careerData.isArchived);
  }

  return Career.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true },
  )
    .setOptions({ includeArchived: true })
    .populate([
      "university",
      "academicUnit",
    ]);
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
