
const mongoose = require("mongoose");

const Career = require("../models/career");
const StudyPlan = require("../models/studyPlan");
const Subject = require("../models/subject");
const PlanSubject = require("../models/planSubject");
const PlanImport = require("../models/planImport");
const PdfExtractionCache = require("../models/pdfExtractionCache");
const {
  resolvePrerequisites,
  findCycle,
} = require("./correlativas.service");

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function text(value, maxLength = 200) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function makeSlug(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function numberOrNull(value, field) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw httpError(`Valor inválido en ${field}`);
  }

  return number;
}

function integerOrNull(value, field, max = 20) {
  const number = numberOrNull(value, field);

  if (number === null) return null;

  if (!Number.isInteger(number) || number < 1 || number > max) {
    throw httpError(`Valor inválido en ${field}`);
  }

  return number;
}

function normalizeDuration(value) {
  const duration = text(value, 30).toUpperCase();

  const durations = {
    C: "CUATRIMESTRAL",
    CUATRIMESTRAL: "CUATRIMESTRAL",
    S: "SEMESTRAL",
    SEMESTRAL: "SEMESTRAL",
    A: "ANUAL",
    ANUAL: "ANUAL",
    T: "TRIMESTRAL",
    TRIMESTRAL: "TRIMESTRAL",
    TF: "OTRA",
    OTRA: "OTRA",
  };

  return durations[duration] || "CUATRIMESTRAL";
}

function normalizeSubject(item, index) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw httpError(`La materia ${index + 1} es inválida`);
  }

  const name = text(item.name);
  const slug = makeSlug(name);

  if (!name || !slug) {
    throw httpError(
      `La materia ${index + 1} necesita un nombre válido`
    );
  }

  const kind = ["Materia", "ACA", "AU", "OTRA"].includes(item.kind)
    ? item.kind
    : "Materia";

  const generic = ["CFC", "CFB", "CFP", "ACA"].includes(
    item.generic
  )
    ? item.generic
    : null;

  const sourceHours = item.hours || {};
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

  const hours = {};

  for (const field of hourFields) {
    hours[field] = numberOrNull(
      sourceHours[field],
      `hours.${field} de ${name}`
    );
  }

  return {
    name,
    slug,
    code: text(item.code, 80),
    kind,
    generic,
    year: integerOrNull(item.year, `año de ${name}`),
    period: integerOrNull(
      item.period ?? item.cuatrimestre,
      `período de ${name}`,
      12
    ),
    duration: normalizeDuration(item.duration),
    hours,
    credits: numberOrNull(item.credits, `créditos de ${name}`) ?? 0,
    optional: item.optional === true,
    intermediate: item.intermediate === true,
    // Texto libre de correlativas del preview (solo memoria: se resuelve
    // a prerequisites luego del insert; no se persiste en PlanSubject).
    correlativasTexto: text(item.correlativasTexto, 500) || null,
  };
}

async function confirmPlanImport(userId, data) {
  const fileHash = text(data.fileHash, 64).toLowerCase();
  const careerId = data.careerId;
  const planName = text(data.name);
  const fileName = text(data.fileName, 255);

  if (!/^[a-f0-9]{64}$/.test(fileHash)) {
    throw httpError("Hash del PDF inválido");
  }

  if (!mongoose.isValidObjectId(careerId)) {
    throw httpError("Seleccioná una carrera válida");
  }

  if (!planName) {
    throw httpError("El plan necesita un nombre");
  }

  if (!fileName) {
    throw httpError("Falta el nombre del archivo PDF");
  }

  if (
    !Array.isArray(data.subjects) ||
    data.subjects.length === 0 ||
    data.subjects.length > 200
  ) {
    throw httpError(
      "El plan debe contener entre 1 y 200 materias"
    );
  }

  // Validar materias antes de escribir en MongoDB.
  const subjects = data.subjects.map(normalizeSubject);

  const seen = new Set();

  for (const subject of subjects) {
    if (seen.has(subject.slug)) {
      throw httpError(
        `La materia "${subject.name}" está repetida`
      );
    }
    seen.add(subject.slug);
  }

  // No permitir importar un hash desconocido.
  const cache = await PdfExtractionCache.findOne({
    fileHash,
  }).sort({ updatedAt: -1 });

  if (
    !cache ||
    cache.status !== "COMPLETADA" ||
    !Array.isArray(cache.result?.subjects) ||
    cache.result.subjects.length === 0
  ) {
    throw httpError(
      "No existe una extracción completa de ese PDF. Subilo nuevamente.",
      409
    );
  }

  // El StudyPlan debe pertenecer a una carrera real.
  const career = await Career.findById(careerId);

  if (!career) {
    throw httpError("La carrera seleccionada no existe", 404);
  }

  // Evitar guardar dos veces el mismo PDF en la misma carrera.
  const previousImports = await PlanImport.find({
    user: userId,
    fileHash,
    status: "COMPLETADA",
  }).populate("studyPlan");

  const alreadyImported = previousImports.some(
    (entry) =>
      entry.studyPlan &&
      String(entry.studyPlan.career) === String(careerId)
  );

  if (alreadyImported) {
    throw httpError(
      "Ya guardaste este PDF en esa carrera",
      409
    );
  }

  let importRecord = null;
  let studyPlan = null;

  const newSubjectIds = [];

  try {
    // Registrar la operación.
    importRecord = await PlanImport.create({
      user: userId,
      fileName,
      fileHash,
      processingMethod: cache.result.aiFallback
        ? "HIBRIDO"
        : "PARSER",
      status: "PROCESANDO",
    });

    // Crear plan personal en borrador.
    // No se publica como plan oficial.
    studyPlan = await StudyPlan.create({
      name: planName,
      career: career._id,
      resolution: "",
      durationYears: numberOrNull(
        data.durationYears,
        "duración del plan"
      ) ?? 0,
      creditsFinal: numberOrNull(
        data.creditsFinal,
        "créditos finales"
      ) ?? 0,
      creditsIntermediate: numberOrNull(
        data.creditsIntermediate,
        "créditos intermedios"
      ) ?? 0,
      intermediateTitle: text(data.intermediateTitle) || null,
      status: "draft",
      createdBy: userId,
    });

    const planSubjects = [];

    for (const item of subjects) {
      // Subject representa la materia genérica.
      // PlanSubject guarda los datos de este plan.
      let subject = await Subject.findOne({
        slug: item.slug,
      });

      if (!subject) {
        subject = await Subject.create({
          name: item.name,
          description: "",
          slug: item.slug,
        });

        newSubjectIds.push(subject._id);
      }

      planSubjects.push({
        studyPlan: studyPlan._id,
        subject: subject._id,
        code: item.code,
        kind: item.kind,
        generic: item.generic,
        year: item.year,
        period: item.period,
        duration: item.duration,
        hours: item.hours,
        credits: item.credits,
        optional: item.optional,
        intermediate: item.intermediate,
        prerequisites: [],
      });
    }

    await PlanSubject.insertMany(planSubjects);

    // Resolver correlativasTexto -> prerequisites (solo coincidencias
    // exactas/compactas; lo dudoso va a review, nunca se inventa).
    // Blindaje histórico: sin autorreferencias y sin ciclos (400 sin guardar).
    const { resolved, review, dropped } = resolvePrerequisites(
      subjects.map((s) => ({
        code: s.code,
        name: s.name,
        correlativasTexto: s.correlativasTexto,
      })),
    );
    const cycle = findCycle(
      {},
      resolved,
    );
    if (cycle) {
      throw httpError(
        `Las correlativas forman un ciclo (${cycle.join(" -> ")}): no se guardó nada`,
      );
    }
    if (resolved.length) {
      const created = await PlanSubject.find({
        studyPlan: studyPlan._id,
      }).select("_id code");
      const idByCode = new Map(created.map((ps) => [ps.code, ps._id]));
      await PlanSubject.bulkWrite(
        resolved.map((u) => ({
          updateOne: {
            filter: { studyPlan: studyPlan._id, code: u.code },
            update: {
              $set: {
                prerequisites: u.requires
                  .map((rc) => idByCode.get(rc))
                  .filter(Boolean)
                  .map((refId) => ({
                    planSubject: refId,
                    requiredStatus: "APROBADA",
                  })),
              },
            },
          },
        })),
        { ordered: false },
      );
    }

    importRecord.status = "COMPLETADA";
    importRecord.studyPlan = studyPlan._id;
    importRecord.errorMessage = null;

    await importRecord.save();

    return {
      message: "Plan guardado correctamente",
      studyPlanId: studyPlan._id,
      planImportId: importRecord._id,
      name: studyPlan.name,
      status: studyPlan.status,
      saved: planSubjects.length,
      prerequisitesResolved: resolved.reduce((a, u) => a + u.requires.length, 0),
      prerequisitesReview: review,
      prerequisitesDropped: dropped,
    };
  } catch (error) {
    // Limpieza compensatoria: MongoDB standalone
    // no permite usar transacciones sin replica set.
    if (studyPlan) {
      try {
        await PlanSubject.deleteMany({
          studyPlan: studyPlan._id,
        });

        await StudyPlan.deleteOne({
          _id: studyPlan._id,
        });
      } catch (cleanupError) {
        console.error(
          "No se pudo limpiar el plan parcial:",
          cleanupError
        );
      }
    }

    // Borrar materias creadas solamente para esta
    // importación si no quedaron referenciadas.
    for (const subjectId of newSubjectIds) {
      try {
        const referenced = await PlanSubject.exists({
          subject: subjectId,
        });

        if (!referenced) {
          await Subject.deleteOne({
            _id: subjectId,
          });
        }
      } catch (cleanupError) {
        console.error(
          "No se pudo limpiar una materia:",
          cleanupError
        );
      }
    }

    if (importRecord) {
      try {
        importRecord.status = "ERROR";
        importRecord.studyPlan = null;
        importRecord.errorMessage = text(error.message, 500);
        await importRecord.save();
      } catch (recordError) {
        console.error(
          "No se pudo registrar el error:",
          recordError
        );
      }
    }

    throw error;
  }
}

module.exports = {
  confirmPlanImport,
};
