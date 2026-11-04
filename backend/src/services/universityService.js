const University = require("../models/university");
const Career = require("../models/career");
const AcademicUnit = require("../models/academicUnit");

const getAllUniversities = async () => {
    return University.find();
};

const findUniversityById = async (id) => {
    return University.findById(id);
};

const createUniversity = async (universityData) => {
    return University.create({
        name: universityData.name,
        description: universityData.description,
    });
};

const updateUniversity = async (id, universityData) => {
    // Lista blanca: el body nunca se pasa crudo a Mongoose.
    const update = {};
    if (universityData.name !== undefined) update.name = universityData.name;
    if (universityData.description !== undefined) {
        update.description = universityData.description;
    }

    return University.findByIdAndUpdate(
        id,
        update,
        {
            new: true,
            runValidators: true,
        }
    );
};

const conflictError = (message) => {
    const error = new Error(message);
    error.statusCode = 409;
    error.expose = true;
    return error;
};

const deleteUniversity = async(id) => {
    // Las carreras archivadas también dependen de la universidad: si no se
    // incluyen, el borrado las dejaría huérfanas.
    const careerExists = await Career.exists({ university: id }).setOptions({
        includeArchived: true,
    });
    if (careerExists) {
        throw conflictError(
            "No se puede borrar una universidad con carreras asociadas"
        );
    }

    if (await AcademicUnit.exists({ university: id })) {
        throw conflictError(
            "No se puede borrar una universidad con institutos asociados"
        );
    }

    return University.findByIdAndDelete(id);
};

module.exports = {
  getAllUniversities,
  findUniversityById,
  createUniversity,
  updateUniversity,
  deleteUniversity,
};