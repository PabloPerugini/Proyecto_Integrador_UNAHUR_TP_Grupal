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
        color: academicUnitData.color || null,
        university: academicUnitData.university,
        parentUnit: academicUnitData.parentUnit || null,
    });
};

const updateAcademicUnit = async (id, academicUnitData) => {
    const current = await AcademicUnit.findById(id);

    if (!current) return null;

    const universityId =
        academicUnitData.university !== undefined
            ? academicUnitData.university
            : current.university;

    const parentUnitId =
        academicUnitData.parentUnit !== undefined
            ? academicUnitData.parentUnit || null
            : current.parentUnit;

    // Revalidar relaciones solo si cambian universidad o unidad padre
    // (mismas reglas que la creación).
    if (
        academicUnitData.university !== undefined ||
        academicUnitData.parentUnit !== undefined
    ) {
        const universityExists = await University.findById(
            universityId
        );

        if (!universityExists) {
            throw new Error("La universidad no existe");
        }

        if (parentUnitId) {
            if (String(parentUnitId) === String(id)) {
                throw new Error(
                    "Una unidad academica no puede ser su propia unidad padre"
                );
            }

            const parentUnit = await AcademicUnit.findById(
                parentUnitId
            );

            if (!parentUnit) {
                throw new Error(
                    "La unidad academica padre no existe"
                );
            }

            if (
                parentUnit.university.toString() !==
                String(universityId)
            ) {
                throw new Error(
                    "La unidad academica padre pertenece a otra universidad"
                );
            }
        }
    }

    // Whitelist de campos editables (evita mass-assignment).
    const updateData = {};

    for (const field of ["name", "type", "description"]) {
        if (academicUnitData[field] !== undefined) {
            updateData[field] = academicUnitData[field];
        }
    }

    if (academicUnitData.color !== undefined) {
        updateData.color = academicUnitData.color || null;
    }

    if (academicUnitData.university !== undefined) {
        updateData.university = universityId;
    }

    if (academicUnitData.parentUnit !== undefined) {
        updateData.parentUnit = parentUnitId;
    }

    if (!Object.keys(updateData).length) {
        return current
            .populate("university")
            .populate("parentUnit");
    }

    return AcademicUnit.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    })
        .populate("university")
        .populate("parentUnit");
};

const deleteAcademicUnit = async (id) => {
  const unit = await AcademicUnit.findById(id);

  if (!unit) return null;

  // Guarda 1: no borrar unidades con carreras asignadas.
  const hasCareers = await Career.exists({ academicUnit: id });

  if (hasCareers) {
    const error = new Error(
      "No se puede eliminar una unidad academica con carreras asignadas"
    );
    error.statusCode = 409;
    throw error;
  }

  // Guarda 2: no borrar unidades que contienen otras unidades.
  const hasChildren = await AcademicUnit.exists({ parentUnit: id });

  if (hasChildren) {
    const error = new Error(
      "No se puede eliminar una unidad academica que contiene otras unidades"
    );
    error.statusCode = 409;
    throw error;
  }

  return AcademicUnit.findByIdAndDelete(id);
};

module.exports = {
  getAllAcademicUnits,
  findAcademicUnitById,
  createAcademicUnit,
  updateAcademicUnit,
  deleteAcademicUnit,
};