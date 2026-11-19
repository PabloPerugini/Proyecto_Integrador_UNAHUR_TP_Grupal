process.env.JWT_SECRET = "secreto-de-prueba-largo-1234";

const request = require("supertest");
const app = require("../src/app");

describe("Rutas protegidas sin iniciar sesión", () => {
    test.each([
        ["get", "/users"],
        ["get", "/users/pepe"],
        ["get", "/study-plans"],
        ["post", "/study-plans"],
        ["get", "/user-study-plans"],
        ["post", "/user-study-plans"],
    ])("%s %s responde 401", async (metodo, ruta) => {
        const res = await request(app)[metodo](ruta);
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

describe("Registro: validaciones del backend", () => {
    const base = {
        nickName: "pepe123",
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@example.com",
        password: "clave123",
    };

    test("un nombre con un número se rechaza con 400", async () => {
        const res = await request(app)
            .post("/users/register")
            .send({ ...base, firstName: "Juan1" });
        expect(res.status).toBe(400);
    });

    test("una contraseña de 5 caracteres se rechaza con 400", async () => {
        const res = await request(app)
            .post("/users/register")
            .send({ ...base, password: "12345" });
        expect(res.status).toBe(400);
    });

    test("una contraseña de 73 caracteres se rechaza con 400", async () => {
        const res = await request(app)
            .post("/users/register")
            .send({ ...base, password: "a".repeat(73) });
        expect(res.status).toBe(400);
    });

    test("un email sin arroba se rechaza con 400", async () => {
        const res = await request(app)
            .post("/users/register")
            .send({ ...base, email: "juan.example.com" });
        expect(res.status).toBe(400);
    });

    test("un nickName de 2 letras se rechaza con 400", async () => {
        const res = await request(app)
            .post("/users/register")
            .send({ ...base, nickName: "ab" });
        expect(res.status).toBe(400);
    });
});