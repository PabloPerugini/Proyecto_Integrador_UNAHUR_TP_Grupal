const User = require('../models/user');
const validateUserExists = require('./validateUserExists');

jest.mock('../models/user', () => ({
    findOne: jest.fn(),
}));

const crearRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

beforeEach(() => {
    User.findOne.mockReset();
});

test('Guarda req.foundUser y llama a next() cuando el usuario existe', async () => {
    const usuario = { nickName: 'juancito', firstName: 'Juan' };
    User.findOne.mockResolvedValue(usuario);
    const req = { params: { nickName: 'juancito' } };
    const res = crearRes();
    const next = jest.fn();

    await validateUserExists(req, res, next);

    expect(req.foundUser).toBe(usuario);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
});

test('Busca el usuario con el nickName que viene en req.params', async () => {
    User.findOne.mockResolvedValue({ nickName: 'JuAnCiTo' });
    const req = { params: { nickName: 'JuAnCiTo' } };
    const res = crearRes();
    const next = jest.fn();

    await validateUserExists(req, res, next);

    expect(User.findOne).toHaveBeenCalledWith({ nickName: 'JuAnCiTo' });
    expect(next).toHaveBeenCalledTimes(1);
});

test('Busca el usuario con un nickName que tiene tildes', async () => {
    User.findOne.mockResolvedValue({ nickName: 'José' });
    const req = { params: { nickName: 'José' } };
    const res = crearRes();
    const next = jest.fn();

    await validateUserExists(req, res, next);

    expect(User.findOne).toHaveBeenCalledWith({ nickName: 'José' });
    expect(req.foundUser.nickName).toBe('José');
    expect(next).toHaveBeenCalledTimes(1);
});

test('Responde 404 y no llama a next() cuando el usuario no existe', async () => {
    User.findOne.mockResolvedValue(null);
    const req = { params: { nickName: 'fantasma' } };
    const res = crearRes();
    const next = jest.fn();

    await validateUserExists(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'El usuario no existe' });
    expect(next).not.toHaveBeenCalled();
    expect(req.foundUser).toBeUndefined();
});

test('Responde 404 cuando los params no tienen nickName', async () => {
    User.findOne.mockResolvedValue(null);
    const req = { params: {} };
    const res = crearRes();
    const next = jest.fn();

    await validateUserExists(req, res, next);

    expect(User.findOne).toHaveBeenCalledWith({ nickName: undefined });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
});

test('Responde 500 y no llama a next() cuando findOne lanza un error', async () => {
    User.findOne.mockRejectedValue(new Error('conexion rota'));
    const req = { params: { nickName: 'juancito' } };
    const res = crearRes();
    const next = jest.fn();

    await validateUserExists(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Error al buscar el usuario',
        error: 'conexion rota',
    }));
    expect(next).not.toHaveBeenCalled();
});
