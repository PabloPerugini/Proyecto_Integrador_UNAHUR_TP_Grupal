jest.mock("../src/models/planSubject", () => ({
  find: jest.fn(),
}));

jest.mock("../src/models/userStudyPlan", () => ({
  findOne: jest.fn(),
}));

jest.mock("../src/models/subjectProgress", () => ({
  find: jest.fn(),
}));

jest.mock("../src/models/studyPlan", () => ({
  findById: jest.fn(),
}));

const PlanSubject = require("../src/models/planSubject");
const UserStudyPlan = require("../src/models/userStudyPlan");
const SubjectProgress = require("../src/models/subjectProgress");
const StudyPlan = require("../src/models/studyPlan");
const { getGraphData } = require("../src/services/studyPlanGraph.service");

const items = [
  {
    _id: "pa",
    code: "A",
    name: "Análisis",
    year: 1,
    period: 1,
    duration: "CUATRIMESTRAL",
    credits: 4,
    kind: "Materia",
    prerequisites: [],
  },
  {
    _id: "pb",
    code: "B",
    name: "Álgebra",
    year: 1,
    period: 2,
    duration: "ANUAL",
    credits: 6,
    kind: "Materia",
    intermediate: true,
    prerequisites: [{ planSubject: "pa", requiredStatus: "APROBADA" }],
  },
];

function mockModels({ progressRows = [], enrollment = null } = {}) {
  PlanSubject.find.mockReturnValue({
    populate: () => ({ lean: async () => items }),
  });
  StudyPlan.findById.mockReturnValue({
    populate: () => ({
      lean: async () => ({
        name: "Plan 2026",
        intermediateTitle: "Tecnicatura en Informática",
        career: {
          name: "Licenciatura en Informática",
          color: "",
          academicUnit: { name: "Instituto de Tecnología e Ingeniería", color: "#123456" },
        },
      }),
    }),
  });
  UserStudyPlan.findOne.mockResolvedValue(enrollment);
  SubjectProgress.find.mockReturnValue({ lean: async () => progressRows });
}

describe("getGraphData: contrato del backend", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("incluye título, color, planSubjectId, estados efectivos e intermedia", async () => {
    mockModels();

    const graph = await getGraphData("plan1", "user1", { target: "B" });

    expect(graph.title).toBe("Licenciatura en Informática · Plan 2026");
    expect(graph.color).toBe("#123456");
    expect(graph.userStudyPlanId).toBeUndefined();
    expect(graph.nodes.map((n) => ({ id: n.id, planSubjectId: n.planSubjectId })))
      .toEqual([
        { id: "A", planSubjectId: "pa" },
        { id: "B", planSubjectId: "pb" },
      ]);
    expect(graph.nodes[0].effectiveStatus).toBe("Disponible");
    expect(graph.nodes[0].savedStatus).toBe("Pendiente");
    expect(graph.nodes[1].effectiveStatus).toBe("Bloqueada");
    expect(graph.intermediate).toEqual({
      title: "Tecnicatura en Informática",
      total: 1,
      aprobadas: 0,
      credits: 6,
      creditsAprob: 0,
    });
    expect(graph.targetPath).toEqual({
      target: "B",
      chain: ["A", "B"],
      chainCosts: [1, 2],
      cost: 3,
      edgeIds: ["A->B"],
      hasCycle: false,
    });
  });

  test("con inscripción usa el progreso guardado y devuelve userStudyPlanId", async () => {
    mockModels({
      enrollment: { _id: "enroll1" },
      progressRows: [{ planSubject: "pa", status: "APROBADA", grade: 8 }],
    });

    const graph = await getGraphData("plan1", "user1");

    expect(graph.userStudyPlanId).toBe("enroll1");
    expect(graph.stats.aprobadas).toBe(1);
    expect(graph.nodes.find((n) => n.code === "B").effectiveStatus).toBe("Disponible");
    expect(graph.targetPath).toBeNull();
  });
});
