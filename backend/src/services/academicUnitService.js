const AcademicUnit = require("../models/academicUnit");
const University = require("../models/university");
const Career = require("../models/career");

const getAllAcademicUnits = async ({ withCounts } = {}) => {
    const units = await AcademicUnit.find()
        .populate("university")
        .populate("parentUnit");

    if (!withCounts) return units;

    // Solo institutos con conteo de carreras visibles (hook excluye archivadas).
    return Promise.all(
        units.map(async (unit) => {
            const careerCount = await Career.countDocuments({
                academicUnit: unit._id,
            });
            return { ...unit.toObject(), careerCount };
        }),
    );
};

const findAcademicUnitById = async (id) => {
    return AcademicUnit.findById(id)
        .populate("university")
        .populate("parentUnit");
};


const createAcademicUnit = async (academicUnitData) => {
    const universityExists = await University.findById(
        academicUnitData.university
    );
    
    if (!universityExists) {
        throw new Error("La universidad no existe");
    }

    if (academicUnitData.parentUnit) {
        const parentUnit = await AcademicUnit.findById(
            academicUnitData.parentUnit
        );

        if (!parentUnit) {
            throw new Error("La unidad academica padre no existe");
        }
        
        if (
            parentUnit.university.toString() !==
            academicUnitData.university.toString()
        ) {
            throw new Error(
                "La unidad academica padre pertenece a otra universidad"
            );
        }
    }

    return AcademicUnit.create({
        name: academicUnitData.name,
        type: academicUnitData.type,
        description: academicUnitData.description,
        university: academicUnitData.university,
        parentUnit: academicUnitData.parentUnit || null,
    });
};

const updateAcademicUnit = async (id, academicUnitData) => {
    return AcademicUnit.findByIdAndUpdate(
        id,
        academicUnitData,
        {
            new: true,
            runValidators: true,
        }
    )
        .populate("university")
        .populate("parentUnit");
};

const deleteAcademicUnit = async (id) => {
  return AcademicUnit.findByIdAndDelete(id);
};

module.exports = {
  getAllAcademicUnits,
  findAcademicUnitById,
  createAcademicUnit,
  updateAcademicUnit,
  deleteAcademicUnit,
};