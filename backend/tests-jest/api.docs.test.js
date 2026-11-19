process.env.JWT_SECRET = "secreto-de-prueba-largo-1234";

const path = require("path");
const request = require("supertest");
const YAML = require("yamljs");
const app = require("../src/app");

describe("Documentación Swagger", () => {
    test("GET /api-docs/ carga la página de Swagger", async () => {
        const res = await request(app).get("/api-docs/");
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/swagger/i);
    });

    test("swagger.yaml es un documento OpenAPI con rutas", () => {
        const doc = YAML.load(path.join(__dirname, "../docs/swagger.yaml"));
        expect(String(doc.openapi)).toMatch(/^3\./);
        expect(Object.keys(doc.paths).length).toBeGreaterThan(0);
    });
});