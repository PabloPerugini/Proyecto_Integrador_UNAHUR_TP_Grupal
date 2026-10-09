const validarUser = require('./validateUser');

const crearRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const BODY_VALIDO = {
    nickName: 'juancito',
    firstName: 'Juan',
    lastName: 'Perez',
    email: 'juan@mail.com',
    password: '1234',
};

test('Llama a next() cuando el body es valido', () => {
    const req = { body: BODY_VALIDO };
    const res = crearRes();
    const next = jest.fn();

    validarUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
});

test('Responde 400 con un campo error y no llama a next() cuando falta el email', () => {
    const req = { body: { nickName: 'juancito', password: '1234' } };
    const res = crearRes();
    const next = jest.fn();

    validarUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
});

test('Responde 400 y no llama a next() cuando el body esta vacio', () => {
    const req = { body: {} };
    const res = crearRes();
    const next = jest.fn();

    validarUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
});

test('Responde 400 y no llama a next() cuando el email no tiene formato valido', () => {
    const req = { body: { ...BODY_VALIDO, email: 'esto-no-es-un-email' } };
    const res = crearRes();
    const next = jest.fn();

    validarUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
});

test('El error devuelto es un string con el mensaje del schema', () => {
    const req = { body: { nickName: 'juancito' } };
    const res = crearRes();
    const next = jest.fn();

    validarUser(req, res, next);

    const bodyRespondido = res.json.mock.calls[0][0];
    expect(typeof bodyRespondido.error).toBe('string');
    expect(bodyRespondido.error).toContain('Email');
});
