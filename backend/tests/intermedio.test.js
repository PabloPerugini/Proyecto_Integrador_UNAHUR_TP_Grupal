// Tests de la red de seguridad de la clasificación del título intermedio:
// `pickIntermediateNames` es la validación dura que corre después de la IA
// (excluye filas que no son materias, exige un mínimo y un tramo coherente).
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  pickIntermediateNames,
} = require("../src/services/aiExtract.service");

const mk = (name, year, kind) => ({ name, year, kind });

// Plan estilo Lic. en Informática: tramo de 1º a 3º año + renglón ACA.
const plan = [
  mk("Programación Estructurada", 1),
  mk("Matemática para Informática 1", 1),
  mk("Organización de las Computadoras 1", 1),
  mk("Inglés", 1),
  mk("Lenguajes Informáticos 1", 1),
  mk("Programación con Objetos 1", 2),
  mk("Estructuras de Datos", 2),
  mk("Bases de Datos", 2),
  mk("Sistemas y organizaciones", 2),
  mk("Construcción de Interfaces de Usuario", 3),
  mk("Estrategias de Persistencia", 3),
  mk("Ingeniería de Software 1", 3),
  mk("Historia de la Universidad", 4),
  mk("Trabajo Final Integrador", 5),
  mk("Actividades Curriculares Acreditables (ACA)", null, "ACA"),
];

const INTERMEDIO = [
  "Programación Estructurada",
  "Matemática para Informática 1",
  "Organización de las Computadoras 1",
  "Inglés",
  "Lenguajes Informáticos 1",
  "Programación con Objetos 1",
  "Estructuras de Datos",
  "Bases de Datos",
  "Construcción de Interfaces de Usuario",
];

test("intermedio: propuesta válida se acepta y el ACA nunca entra", () => {
  const wanted = [
    ...INTERMEDIO,
    "Actividades Curriculares Acreditables (ACA)",
    "Materia Inventada por la IA",
  ];
  const r = pickIntermediateNames(plan, wanted);
  assert.equal(r.rejected, 0);
  assert.deepEqual(r.names, INTERMEDIO);
  assert.ok(!r.names.some((n) => /ACA|Acreditables/i.test(n)));
});

test("intermedio: matching tolera mayúsculas y espacios de más", () => {
  const wanted = [
    "  programación   ESTRUCTURADA ",
    "matemática para informática 1",
    "organización de las computadoras 1",
    "inglés",
    "lenguajes informáticos 1",
    "programación con objetos 1",
    "estructuras de datos",
    "bases de datos",
    "construcción de interfaces de usuario",
  ];
  const r = pickIntermediateNames(plan, wanted);
  assert.equal(r.names.length, 9);
  assert.equal(r.rejected, 0);
});

test("intermedio: propuesta de pocas materias se descarta (BUG-017)", () => {
  const r = pickIntermediateNames(plan, [
    "Programación Estructurada",
    "Inglés",
    "Bases de Datos",
  ]);
  assert.deepEqual(r.names, []);
  assert.equal(r.rejected, 3);
});

test("intermedio: propuesta con más de 3 años de span se descarta", () => {
  const r = pickIntermediateNames(plan, [
    "Programación Estructurada",
    "Programación con Objetos 1",
    "Bases de Datos",
    "Construcción de Interfaces de Usuario",
    "Historia de la Universidad",
    "Trabajo Final Integrador",
  ]);
  assert.deepEqual(r.names, []);
  assert.equal(r.rejected, 6);
});

test("intermedio: propuesta que cubre casi todo el plan se descarta", () => {
  const chico = [
    mk("A", 1),
    mk("B", 1),
    mk("C", 1),
    mk("D", 2),
    mk("E", 2),
  ];
  const r = pickIntermediateNames(
    chico,
    chico.map((s) => s.name),
  );
  assert.deepEqual(r.names, []);
  assert.equal(r.rejected, 5);
});

test("intermedio: plan sin años sigue aceptando un tramo de 5 materias", () => {
  const sinAnios = [
    mk("Uno", null),
    mk("Dos", null),
    mk("Tres", null),
    mk("Cuatro", null),
    mk("Cinco", null),
    mk("Seis", null),
    mk("Siete", null),
    mk("Ocho", null),
  ];
  const r = pickIntermediateNames(sinAnios, [
    "Uno",
    "Dos",
    "Tres",
    "Cuatro",
    "Cinco",
  ]);
  assert.equal(r.names.length, 5);
  assert.equal(r.rejected, 0);
});
