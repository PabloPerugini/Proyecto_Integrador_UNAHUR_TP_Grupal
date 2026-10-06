const University = require("../models/university");

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
    return University.findByIdAndUpdate(
        id,
        universityData,
        {
            new: true,
            runValidators: true,
        }
    );
};

const deleteUniversity = async(id) => {
    return University.findByIdAndDelete(id);
};

module.exports = {
  getAllUniversities,
  findUniversityById,
  createUniversity,
  updateUniversity,
  deleteUniversity,
};