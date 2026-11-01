const {
  ACTIVE_ENROLLMENT_FILTER,
  planAccessFilter,
  planVisibilityFilter,
} = require("../src/services/planVisibility");

describe("planVisibility", () => {
  test("un ADMIN no recibe filtro de visibilidad", () => {
    expect(planVisibilityFilter({ _id: "admin1", rol: "ADMIN" })).toEqual({});
  });

  test("un usuario ve oficiales publicados y propios, solo activos", () => {
    expect(planVisibilityFilter({ _id: "user1", rol: "USUARIO" })).toEqual({
      isActive: { $ne: false },
      $or: [
        { createdBy: null, status: "published" },
        { createdBy: "user1" },
      ],
    });
  });

  test("el acceso por id de usuario usa el mismo criterio que un usuario común", () => {
    expect(planAccessFilter("user1")).toEqual(
      planVisibilityFilter({ _id: "user1", rol: "USUARIO" }),
    );
  });

  test("las inscripciones archivadas no cuentan como activas", () => {
    expect(ACTIVE_ENROLLMENT_FILTER).toEqual({ archivedAt: null });
  });
});
