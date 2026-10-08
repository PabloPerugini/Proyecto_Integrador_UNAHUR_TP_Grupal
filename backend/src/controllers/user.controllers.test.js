const User = require('../models/user');
const cacheService = require('../services/cache.service');
const { createUser, getAllUsers, getUserByNickName, updateUser, deleteUser, loginUser } = require('./user.controllers');

jest.mock('../models/user', () => ({
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
}));

jest.mock('../services/cache.service', () => ({
    getCache: jest.fn(),
    setCache: jest.fn(),
    invalidateCache: jest.fn(),
}));

const crearRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

beforeEach(() => {
    jest.clearAllMocks();
});

test('Responde 400 si falta nickName o password', async () => {
    const req = { body: { nickName: 'lucia' } };
    const res = crearRes();

    await loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Nickname y contraseña son obligatorios' });
});

test('Responde 400 si el body esta vacio', async () => {
    const req = { body: {} };
    const res = crearRes();

    await loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findOne).not.toHaveBeenCalled();
});

test('Responde 404 si el usuario no existe', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { body: { nickName: 'noExiste', password: '123456' } };
    const res = crearRes();

    await loginUser(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ nickName: 'noExiste' });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'El usuario no existe' });
});

test('Responde 401 si la contraseña es incorrecta', async () => {
    const usuario = { nickName: 'lucia', comparePassword: jest.fn().mockResolvedValue(false) };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(usuario) });
    const req = { body: { nickName: 'lucia', password: 'mala' } };
    const res = crearRes();

    await loginUser(req, res);

    expect(usuario.comparePassword).toHaveBeenCalledWith('mala');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Contraseña incorrecta' });
});

test('Responde 200 con el usuario cuando todo esta bien', async () => {
    const usuario = { nickName: 'lucia', comparePassword: jest.fn().mockResolvedValue(true) };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(usuario) });
    const req = { body: { nickName: 'lucia', password: 'buena' } };
    const res = crearRes();

    await loginUser(req, res);

    expect(usuario.comparePassword).toHaveBeenCalledWith('buena');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(usuario);
});

test('No usa el cache en el login', async () => {
    const usuario = { nickName: 'lucia', comparePassword: jest.fn().mockResolvedValue(true) };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(usuario) });
    const req = { body: { nickName: 'lucia', password: 'buena' } };
    const res = crearRes();

    await loginUser(req, res);

    expect(cacheService.getCache).not.toHaveBeenCalled();
    expect(cacheService.setCache).not.toHaveBeenCalled();
});

test('createUser responde 201 con el usuario creado', async () => {
    const nuevoUsuario = { nickName: 'lucia', email: 'lucia@mail.com' };
    User.create.mockResolvedValue(nuevoUsuario);
    const req = { body: { nickName: 'lucia', email: 'lucia@mail.com' } };
    const res = crearRes();

    await createUser(req, res);

    expect(User.create).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(nuevoUsuario);
});

test('createUser responde 400 si falla al crear el usuario', async () => {
    User.create.mockRejectedValue(new Error('nickName duplicado'));
    const req = { body: { nickName: 'repetido' } };
    const res = crearRes();

    await createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error al crear el usuario', error: 'nickName duplicado' });
});

test('getAllUsers responde 200 con la lista de usuarios', async () => {
    const usuarios = [{ nickName: 'lucia' }, { nickName: 'marco' }];
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue(usuarios) });
    const req = {};
    const res = crearRes();

    await getAllUsers(req, res);

    expect(User.find).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(usuarios);
});

test('getAllUsers responde 200 con una lista vacia', async () => {
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    const req = {};
    const res = crearRes();

    await getAllUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
});

test('getAllUsers responde 500 si falla la busqueda', async () => {
    User.find.mockReturnValue({ select: jest.fn().mockRejectedValue(new Error('fallo de base de datos')) });
    const req = {};
    const res = crearRes();

    await getAllUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error al obtener los usuarios', error: 'fallo de base de datos' });
});

test('getUserByNickName devuelve el usuario desde el cache', async () => {
    const usuarioCacheado = { nickName: 'lucia', email: 'lucia@mail.com' };
    cacheService.getCache.mockResolvedValue(JSON.stringify(usuarioCacheado));
    const req = { params: { nickName: 'lucia' } };
    const res = crearRes();

    await getUserByNickName(req, res);

    expect(cacheService.getCache).toHaveBeenCalledWith('user:lucia');
    expect(User.findOne).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(usuarioCacheado);
});

test('getUserByNickName responde 404 si no hay usuario', async () => {
    cacheService.getCache.mockResolvedValue(null);
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { params: { nickName: 'noExiste' } };
    const res = crearRes();

    await getUserByNickName(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ nickName: 'noExiste' });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Usuario no encontrado' });
});

test('getUserByNickName responde 200 y guarda en cache si lo encuentra', async () => {
    const perfil = { nickName: 'lucia', email: 'lucia@mail.com' };
    cacheService.getCache.mockResolvedValue(null);
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(perfil) });
    const req = { params: { nickName: 'lucia' } };
    const res = crearRes();

    await getUserByNickName(req, res);

    expect(cacheService.setCache).toHaveBeenCalledWith('user:lucia', perfil, 300);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(perfil);
});

test('updateUser responde 200 e invalida el cache', async () => {
    const usuarioActualizado = { nickName: 'lucia', email: 'nuevo@mail.com' };
    User.findOneAndUpdate.mockResolvedValue(usuarioActualizado);
    const req = { params: { nickName: 'lucia' }, body: { email: 'nuevo@mail.com' } };
    const res = crearRes();

    await updateUser(req, res);

    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { nickName: 'lucia' },
        req.body,
        { returnDocument: 'after', runValidators: true }
    );
    expect(cacheService.invalidateCache).toHaveBeenCalledWith(['user:lucia']);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(usuarioActualizado);
});

test('deleteUser responde 200 con "Usuario eliminado"', async () => {
    User.findOneAndDelete.mockResolvedValue({});
    const req = { params: { nickName: 'lucia' } };
    const res = crearRes();

    await deleteUser(req, res);

    expect(User.findOneAndDelete).toHaveBeenCalledWith({ nickName: 'lucia' });
    expect(cacheService.invalidateCache).toHaveBeenCalledWith(['user:lucia']);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Usuario eliminado' });
});
