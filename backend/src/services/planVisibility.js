// Criterios únicos de visibilidad de planes y vigencia de inscripciones.
// Un plan oficial es el que no tiene dueño y está publicado. Los planes
// privados solo los ve su creador. Los ADMIN ven todo, incluso inactivos.

const ACTIVE_PLAN_FILTER = {
  isActive: { $ne: false },
};

const ACTIVE_ENROLLMENT_FILTER = {
  archivedAt: null,
};

const OFFICIAL_PLAN_FILTER = {
  createdBy: null,
  status: "published",
};

// Filtro para consultas que solo tienen el id del usuario (sin rol).
const planAccessFilter = (userId) => ({
  ...ACTIVE_PLAN_FILTER,
  $or: [
    OFFICIAL_PLAN_FILTER,
    { createdBy: userId },
  ],
});

// Filtro para consultas que ya tienen el usuario autenticado.
const planVisibilityFilter = (user) => {
  if (user?.rol === "ADMIN") return {};

  return planAccessFilter(user?._id);
};

module.exports = {
  ACTIVE_ENROLLMENT_FILTER,
  planAccessFilter,
  planVisibilityFilter,
};
