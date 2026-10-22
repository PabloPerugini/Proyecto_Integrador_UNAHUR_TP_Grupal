const authAdmin = require("../src/middlewares/authAdmin");

function crearRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe("authAdmin", () => {
    test("sin usuario responde 401", () => {
        const res = crearRes();
        const next = jest.fn();
        authAdmin({}, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test("con rol USER responde 403", () => {
        const req = { user: { rol: "USER" } };
        const res = crearRes();
        const next = jest.fn();
        authAdmin(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test("con rol ADMIN deja pasar", () => {
        const req = { user: { rol: "ADMIN" } };
        const res = crearRes();
        const next = jest.fn();
        authAdmin(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});