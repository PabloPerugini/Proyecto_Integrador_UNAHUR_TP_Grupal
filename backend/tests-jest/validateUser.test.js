const validateUser = require("../src/middlewares/validateUser");

function crearRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

const usuarioValido = {
    nickName: "juan",
    firstName: "Juan",
    lastName: "Perez",
    email: "JUAN@mail.com",
    password: "123456",
};

describe("validateUser", () => {
    test("con datos válidos llama a next y normaliza el email", () => {
        const req = { body: { ...usuarioValido } };
        const res = crearRes();
        const next = jest.fn();
        validateUser(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.body.email).toBe("juan@mail.com");
    });

    test("con body vacío responde 400 y no llama a next", () => {
        const req = { body: {} };
        const res = crearRes();
        const next = jest.fn();
        validateUser(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
    });

    test("devuelve la lista de errores", () => {
        const req = { body: {} };
        const res = crearRes();
        validateUser(req, res, jest.fn());
        const respuesta = res.json.mock.calls[0][0];
        expect(respuesta.message).toBe("Datos de usuario inválidos");
        expect(respuesta.errors.length).toBeGreaterThan(1);
        });
    });

    test("elimina campos desconocidos (por ejemplo rol ADMIN)", () => {
        const req = { body: { ...usuarioValido, rol: "ADMIN" } };
        validateUser(req, crearRes(), jest.fn());
        expect(req.body.rol).toBeUndefined();
});