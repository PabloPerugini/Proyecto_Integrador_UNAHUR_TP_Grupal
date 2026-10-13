// Curaduría del catálogo F0: crea Salud Comunitaria, crea carreras canónicas
// por instituto, re-apunta los planes publicados y archiva la basura de
// loadtest. NO BORRA NADA (isArchived + filtro global en el modelo).
//
// Uso (desde backend/):
//   node scripts/curar-catalogo.js            -> dry-run (no escribe)
//   node scripts/curar-catalogo.js --apply    -> aplica cambios
//   node scripts/curar-catalogo.js --apply --uri mongodb://127.0.0.1:27018/unahur-tp
//
// Idempotente: se puede correr varias veces. Guarda snapshot previo en
// scripts/informes/curaduria-backup-<timestamp>.json

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const AcademicUnit = require("../src/models/academicUnit");
const Career = require("../src/models/career");
const StudyPlan = require("../src/models/studyPlan");

const UNAHUR_ID = "6ac96c14e4f81a3c1e45fbc3";
const UNITS = {
  BIOTEC: "6ac96c14e4f81a3c1e45fbc4",
  ITI: "6ac96c14e4f81a3c1e45fbc7",
  EDU: "6ac96c15e4f81a3c1e45fbce",
};
const SALUD_NAME = "Instituto de Salud Comunitaria";

// career vieja (basura) -> carrera canónica { name, unit }
const MAP = {
  // Biotecnología
  "6ab43d709df1e750f3e95a1b": { name: "Ingeniería Agronómica", unit: "BIOTEC" },
  "6ab43d339df1e750f3e95a12": { name: "Licenciatura en Gestión Ambiental", unit: "BIOTEC" },
  "6ab43d559df1e750f3e95a17": { name: "Licenciatura en Tecnología de los Alimentos", unit: "BIOTEC" },
  "6ab43d7d9df1e750f3e95a1d": { name: "Licenciatura en Desarrollo Agrario", unit: "BIOTEC" },
  "6ab57a5a32aef56e9a3ce6e3": { name: "Licenciatura en Biotecnología", unit: "BIOTEC" },
  // Salud Comunitaria
  "6ab43d419df1e750f3e95a14": { name: "Licenciatura en Kinesiología y Fisiatría", unit: "SALUD" },
  "6ab43d4e9df1e750f3e95a16": { name: "Licenciatura en Obstetricia", unit: "SALUD" },
  "6ab43e6f9df1e750f3e95a2c": { name: "Licenciatura en Enfermería", unit: "SALUD" },
  "6ab43d489df1e750f3e95a15": { name: "Licenciatura en Nutrición", unit: "SALUD" },
  // Tecnología e Ingeniería
  "6ab43d1f9df1e750f3e95a0f": { name: "Ingeniería en Energía Eléctrica", unit: "ITI" },
  "6ab43d189df1e750f3e95a0e": { name: "Ingeniería Metalúrgica", unit: "ITI" },
  "6ab43d3a9df1e750f3e95a13": { name: "Licenciatura en Informática", unit: "ITI" },
  "6ab43d8b9df1e750f3e95a1f": { name: "Licenciatura en Diseño Industrial", unit: "ITI" },
  // Educación
  "6ab43d2d9df1e750f3e95a11": { name: "Licenciatura en Educación", unit: "EDU" },
  "6ab43e689df1e750f3e95a2b": { name: "Profesorado Universitario de Chino", unit: "EDU" },
  "6ab43e759df1e750f3e95a2d": { name: "Profesorado Universitario de Biología", unit: "EDU" },
  "6ab43dd09df1e750f3e95a2a": { name: "Profesorado Universitario de Inglés", unit: "EDU" },
  "6ab43dcd9df1e750f3e95a29": { name: "Profesorado Universitario de Matemática", unit: "EDU" },
  "6ab43d699df1e750f3e95a1a": { name: "Profesorado Universitario de Geografía", unit: "EDU" },
};

async function main() {
  const apply = process.argv.includes("--apply");
  const uriArg = process.argv.indexOf("--uri");
  const uri =
    (uriArg !== -1 && process.argv[uriArg + 1]) ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27018/unahur-tp";

  await mongoose.connect(uri);
  const report = { dryRun: !apply, createdUnits: [], createdCareers: [], repointedPlans: 0, archivedCareers: 0, warnings: [] };

  // Snapshot previo (siempre, incluso en dry-run).
  const snap = {
    at: new Date().toISOString(),
    academicUnits: await AcademicUnit.find({}).lean(),
    careers: await Career.find({}).setOptions({ includeArchived: true }).lean(),
    planCareerRefs: (await StudyPlan.find({}, { career: 1 }).lean()).map((p) => ({
      plan: String(p._id),
      career: String(p.career),
    })),
  };
  const informesDir = path.join(__dirname, "informes");
  fs.mkdirSync(informesDir, { recursive: true });
  const snapPath = path.join(informesDir, `curaduria-backup-${Date.now()}.json`);
  fs.writeFileSync(snapPath, JSON.stringify(snap));
  report.backup = snapPath;

  // 1. Salud Comunitaria (idempotente por nombre).
  let salud = await AcademicUnit.findOne({ name: SALUD_NAME });
  if (!salud) {
    report.createdUnits.push(SALUD_NAME);
    if (apply) {
      salud = await AcademicUnit.create({
        name: SALUD_NAME,
        type: "INSTITUTO",
        university: UNAHUR_ID,
      });
    } else {
      salud = { _id: "PENDIENTE" };
    }
  }
  const unitId = (key) => (key === "SALUD" ? String(salud._id) : UNITS[key]);

  // 2. Carreras canónicas (idempotentes por nombre+unidad).
  const canonicalByOldId = {};
  for (const [oldId, spec] of Object.entries(MAP)) {
    const uId = unitId(spec.unit);
    let career =
      uId !== "PENDIENTE"
        ? await Career.findOne({ name: spec.name, academicUnit: uId }).setOptions({ includeArchived: true })
        : null;
    if (!career) {
      report.createdCareers.push(`${spec.name} [${spec.unit}]`);
      if (apply) {
        career = await Career.create({
          name: spec.name,
          university: UNAHUR_ID,
          academicUnit: uId,
          color: "#6841df",
        });
      } else {
        career = { _id: `PENDIENTE:${oldId}` };
      }
    }
    canonicalByOldId[oldId] = String(career._id);
  }

  if (apply) {
    // 3. Re-apuntar planes a carreras canónicas.
    for (const [oldId, newId] of Object.entries(canonicalByOldId)) {
      const r = await StudyPlan.updateMany({ career: oldId }, { career: newId });
      report.repointedPlans += r.modifiedCount || 0;
    }

    // 4. Archivar basura: sin unidad y sin planes apuntando.
    const stillReferenced = new Set(
      (await StudyPlan.find({}, { career: 1 }).lean()).map((p) => String(p.career)),
    );
    const junk = await Career.find({ academicUnit: null }).setOptions({ includeArchived: true });
    for (const c of junk) {
      if (stillReferenced.has(String(c._id))) {
        report.warnings.push(`No se archiva ${c.name}: todavía tiene planes`);
        continue;
      }
      if (!c.isArchived) {
        await Career.updateOne({ _id: c._id }, { isArchived: true });
        report.archivedCareers += 1;
      }
    }

    // 5. Verificación: ningún plan huérfano ni a archivada.
    const archivedIds = new Set(
      (await Career.find({ isArchived: true }, { _id: 1 }).setOptions({ includeArchived: true }).lean()).map((c) =>
        String(c._id),
      ),
    );
    const orphans = await StudyPlan.find({
      $or: [{ career: null }, { career: { $in: [...archivedIds] } }],
    }).lean();
    if (orphans.length > 0) {
      throw new Error(`Verificación fallida: ${orphans.length} planes huérfanos/archivados`);
    }
  }

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(`curar-catalogo: ${error.message}`);
  process.exit(1);
});
