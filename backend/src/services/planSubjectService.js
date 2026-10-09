
const mongoose = require("mongoose");

const PlanSubject = require("../models/planSubject");
const StudyPlan = require("../models/studyPlan");
const Subject = require("../models/subject");
const SubjectProgress = require("../models/subjectProgress");

// Obtener todas las materias de un plan
const getPlanSubjects = async (studyPlanId) => {
  return PlanSubject.find({
    studyPlan: studyPlanId,
  })
    .populate("subject")
    .populate("prerequisites.planSubject");
};

// Obtener una materia específica
const findPlanSubjectById = async (studyPlanId, id) => {
  return PlanSubject.findOne({
    _id: id,
    studyPlan: studyPlanId,
  }).populate("subject");
};

// Validar las correlativas
const validatePrerequisites = async (
  studyPlanId,
  currentId,
  prerequisites
) => {
  if (!Array.isArray(prerequisites)) {
    throw new Error("Las correlativas deben ser un arreglo");
  }

  const ids = [];
  const seen = new Set();

  for (const prerequisite of prerequisites) {
    const id = prerequisite?.planSubject;

    if (!mongoose.isValidObjectId(id)) {
      throw new Error("ID de correlativa inválido");
    }

    if (
      !["REGULARIZADA", "APROBADA"].includes(
        prerequisite?.requiredStatus
      )
    ) {
      throw new Error("Estado requerido inválido");
    }

    const normalizedId = new mongoose.Types.ObjectId(
      id
    ).toString();

    if (seen.has(normalizedId)) {
      throw new Error("Hay correlativas duplicadas");
    }

    seen.add(normalizedId);
    ids.push(normalizedId);
  }

  // Obtener las materias del mismo plan
  const subjects = await PlanSubject.find({
    studyPlan: studyPlanId,
  })
    .select("_id prerequisites")
    .lean();

  // Construir el grafo de correlativas
  const graph = new Map();

  for (const subject of subjects) {
    graph.set(
      subject._id.toString(),
      (subject.prerequisites || [])
        .filter((p) => p.planSubject)
        .map((p) => p.planSubject.toString())
    );
  }

  // Verificar existencia y evitar autorreferencias
  for (const id of ids) {
    if (!graph.has(id)) {
      throw new Error(
        "La correlativa no existe en este plan"
      );
    }

    if (currentId && id === currentId.toString()) {
      throw new Error(
        "Una materia no puede ser correlativa de sí misma"
      );
    }
  }

  // Detectar ciclos al actualizar una materia
  if (currentId) {
    const target = currentId.toString();

    graph.set(target, ids);

    const reachesTarget = (node, visited) => {
      if (node === target) return true;

      if (visited.has(node)) return false;

      visited.add(node);

      return (graph.get(node) || []).some((next) =>
        reachesTarget(next, visited)
      );
    };

    for (const id of ids) {
      if (reachesTarget(id, new Set())) {
        throw new Error(
          "Las correlativas forman una dependencia circular"
        );
      }
    }
  }
};

// Crear una materia dentro de un plan
const createPlanSubject = async (planSubjectData) => {
  const studyPlanExists = await StudyPlan.findById(
    planSubjectData.studyPlan
  );

  if (!studyPlanExists) {
    throw new Error("El plan de estudio no existe");
  }

  const subjectExists = await Subject.findById(
    planSubjectData.subject
  );

  if (!subjectExists) {
    throw new Error("La materia no existe");
  }

  const alreadyExists = await PlanSubject.findOne({
    studyPlan: planSubjectData.studyPlan,
    subject: planSubjectData.subject,
  });

  if (alreadyExists) {
    throw new Error(
      "La materia ya pertenece a este plan de estudio"
    );
  }

  // Validar correlativas antes de crear
  if (planSubjectData.prerequisites !== undefined) {
    await validatePrerequisites(
      planSubjectData.studyPlan,
      null,
      planSubjectData.prerequisites
    );
  }

  return PlanSubject.create({
    studyPlan: planSubjectData.studyPlan,
    subject: planSubjectData.subject,
    code: planSubjectData.code,
    year: planSubjectData.year,
    period: planSubjectData.period,
    duration: planSubjectData.duration,
    kind: planSubjectData.kind,
    generic: planSubjectData.generic,
    hours: planSubjectData.hours,
    credits: planSubjectData.credits,
    optional: planSubjectData.optional,
    intermediate: planSubjectData.intermediate,
    prerequisites: planSubjectData.prerequisites || [],
  });
};

// Actualizar una materia dentro de un plan
const updatePlanSubject = async (studyPlanId, id, data) => {
  const planSubject = await PlanSubject.findOne({
    _id: id,
    studyPlan: studyPlanId,
  });

  if (!planSubject) return null;

  let updated = false;

  // Correlativas
  if (data.prerequisites !== undefined) {
    await validatePrerequisites(
      studyPlanId,
      id,
      data.prerequisites
    );

    planSubject.prerequisites = data.prerequisites;
    updated = true;
  }

  // Código
  if (data.code !== undefined) {
    planSubject.code = data.code;
    updated = true;
  }

  // Año
  if (data.year !== undefined) {
    planSubject.year = data.year;
    updated = true;
  }

  // Período
  if (data.period !== undefined) {
    planSubject.period = data.period;
    updated = true;
  }

  // Duración
  if (data.duration !== undefined) {
    planSubject.duration = data.duration;
    updated = true;
  }

  // Créditos
  if (data.credits !== undefined) {
    planSubject.credits = data.credits;
    updated = true;
  }

  // Materia optativa
  if (data.optional !== undefined) {
    planSubject.optional = data.optional;
    updated = true;
  }

  // Título intermedio
  if (data.intermediate !== undefined) {
    planSubject.intermediate = data.intermediate;
    updated = true;
  }

  // Tipo de materia
  if (data.kind !== undefined) {
    planSubject.kind = data.kind;
    updated = true;
  }

  // Campo de formación
  if (data.generic !== undefined) {
    planSubject.generic = data.generic;
    updated = true;
  }

  // Cargas horarias
  if (data.hours !== undefined) {
    if (
      !data.hours ||
      typeof data.hours !== "object" ||
      Array.isArray(data.hours)
    ) {
      throw new Error("Formato de horas inválido");
    }

    const hourFields = [
      "weekly",
      "total",
      "his",
      "hit",
      "hite",
      "hip",
      "htat",
      "ht",
    ];

    for (const field of hourFields) {
      if (data.hours[field] !== undefined) {
        planSubject.set(
          `hours.${field}`,
          data.hours[field]
        );

        updated = true;
      }
    }
  }

  if (!updated) {
    throw new Error(
      "No se enviaron campos válidos para actualizar"
    );
  }

  return planSubject.save();
};

// Eliminar una materia del plan
const deletePlanSubject = async (studyPlanId, id) => {
  const planSubject = await PlanSubject.findOne({
    _id: id,
    studyPlan: studyPlanId,
  });

  if (!planSubject) return null;

  // Evitar borrar materias utilizadas como correlativas
  const hasDependents = await PlanSubject.exists({
    studyPlan: studyPlanId,
    "prerequisites.planSubject": id,
  });

  if (hasDependents) {
    throw new Error(
      "No se puede eliminar la materia porque otras materias la tienen como correlativa"
    );
  }

  // Evitar borrar materias con progreso académico registrado
  const hasProgress = await SubjectProgress.exists({
    planSubject: id,
  });

  if (hasProgress) {
    throw new Error(
      "No se puede eliminar la materia porque tiene progreso académico registrado"
    );
  }

  return PlanSubject.findOneAndDelete({
    _id: id,
    studyPlan: studyPlanId,
  });
};

module.exports = {
  getPlanSubjects,
  findPlanSubjectById,
  createPlanSubject,
  updatePlanSubject,
  deletePlanSubject,
};
