function planSubjectName(planSubject) {
  const override = typeof planSubject.nameOverride === "string"
    ? planSubject.nameOverride.trim()
    : "";
  const catalogName = planSubject.subject && typeof planSubject.subject === "object"
    && typeof planSubject.subject.name === "string"
    ? planSubject.subject.name.trim()
    : "";
  return override || catalogName || planSubject.code?.trim() || "Materia sin nombre";
}

module.exports = { planSubjectName };
