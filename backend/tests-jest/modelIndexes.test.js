const Subject = require("../src/models/subject");
const SubjectProgress = require("../src/models/subjectProgress");

// Índices de consulta (A11): no son únicos porque los códigos/slugs se
// repiten entre planes y el mismo planSubject aparece en varios usuarios.
test("Subject tiene un índice no único por slug", () => {
  const indexes = Subject.schema.indexes();
  const slug = indexes.find(([fields]) => fields.slug === 1);
  expect(slug).toBeDefined();
  expect(slug[1]?.unique).not.toBe(true);
});

test("SubjectProgress tiene un índice no único por planSubject", () => {
  const indexes = SubjectProgress.schema.indexes();
  const planSubject = indexes.find(
    ([fields]) => fields.planSubject === 1 && Object.keys(fields).length === 1,
  );
  expect(planSubject).toBeDefined();
  expect(planSubject[1]?.unique).not.toBe(true);
});
