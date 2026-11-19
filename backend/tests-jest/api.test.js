process.env.JWT_SECRET = "secreto-de-prueba-largo-1234";

const request = require("supertest");
const app = require("../src/app");

describe("API básica (sin base de datos)", () => {
    test("GET /health responde 200 y status ok", async () => {
        const res = await request(app).get("/health");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
    });

    test("GET / responde 200 con el nombre de la API", async () => {
        const res = await request(app).get("/");
        expect(res.status).toBe(200);
        expect(res.body.name).toBe("UNAHUR TP API");
    });

    test("Una ruta que no existe responde 404", async () => {
        const res = await request(app).get("/ruta-que-no-existe");
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toBe("Ruta no encontrada");
    });

    test("GET /users/me sin iniciar sesión responde 401", async () => {
        const res = await request(app).get("/users/me");
        expect(res.status).toBe(401);
    });

    test("POST /users/register con body vacío responde 400", async () => {
        const res = await request(app).post("/users/register").send({});
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("Un JSON mal formado responde 400", async () => {
        const res = await request(app)
            .post("/users/login")
            .set("Content-Type", "application/json")
            .send("{esto no es json");
        expect(res.status).toBe(400);
    });
});