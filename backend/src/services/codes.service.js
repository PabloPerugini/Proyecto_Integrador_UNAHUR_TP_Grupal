// Códigos únicos de materia: los PlanSubjects pueden compartir code (p. ej. ACA),
// y esos códigos se usan como id de nodo del grafo y en edges. Un id repetido
// rompe React Flow. Criterio idéntico al planGraphAdapter del frontend:
// el primero conserva su código; los siguientes llevan sufijo -<últimos 5>_id.
const uniqueSubjectCodes = (items) => {
  const seen = new Set();
  const map = new Map();
  for (const item of items) {
    let code = item.code?.trim() || String(item._id).slice(-8);
    if (seen.has(code)) code = `${code}-${String(item._id).slice(-5)}`;
    seen.add(code);
    map.set(String(item._id), code);
  }
  return map;
};

module.exports = { uniqueSubjectCodes };
