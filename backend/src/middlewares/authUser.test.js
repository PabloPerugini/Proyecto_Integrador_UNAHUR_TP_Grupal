const authUser = require('./authUser');

const ID_VALIDO = '507f1f77bcf86cd799439011';

const crearReq = ({ header = null, body = {}, query = {} } = {}) => ({
    header: jest.fn().mockReturnValue(header),
    body,
    query,
});

const crearRes = () => ({});

test('Toma el id del header x-user-id cuando es un ObjectId valido', () => {
    const req = crearReq({ header: ID_VALIDO, body: { userId: 'otro' } });
    const next = jest.fn();

    authUser(req, crearRes(), next);

    expect(req.header).toHaveBeenCalledWith('x-user-id');
    expect(req.userId).toBe(ID_VALIDO);
    expect(next).toHaveBeenCalledTimes(1);
});

test('Toma el id del body.userId cuando no viene el header', () => {
    const req = crearReq({ body: { userId: ID_VALIDO } });
    const next = jest.fn();

    authUser(req, crearRes(), next);

    expect(req.userId).toBe(ID_VALIDO);
    expect(next).toHaveBeenCalledTimes(1);
});

test('Toma el id del query.userId cuando no vienen header ni body', () => {
    const req = crearReq({ query: { userId: ID_VALIDO } });
    const next = jest.fn();

    authUser(req, crearRes(), next);

    expect(req.userId).toBe(ID_VALIDO);
    expect(next).toHaveBeenCalledTimes(1);
});

test('El header tiene prioridad sobre el body y el query', () => {
    const req = crearReq({
        header: ID_VALIDO,
        body: { userId: '507f1f77bcf86cd799439012' },
        query: { userId: '507f1f77bcf86cd799439013' },
    });
    const next = jest.fn();

    authUser(req, crearRes(), next);

    expect(req.userId).toBe(ID_VALIDO);
    expect(next).toHaveBeenCalledTimes(1);
});

test('Deja req.userId en null cuando el id del header no es valido', () => {
    const req = crearReq({ header: 'esto-no-es-un-id' });
    const next = jest.fn();

    authUser(req, crearRes(), next);

    expect(req.userId).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
});

test('Deja req.userId en null cuando el id del body no es valido', () => {
    const req = crearReq({ body: { userId: '123' } });
    const next = jest.fn();

    authUser(req, crearRes(), next);

    expect(req.userId).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
});

test('Deja req.userId en null cuando el id del query no es valido', () => {
    const req = crearReq({ query: { userId: 'abc' } });
    const next = jest.fn();

    authUser(req, crearRes(), next);

    expect(req.userId).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
});

test('Deja req.userId en null cuando no viene ningun id', () => {
    const req = crearReq();
    const next = jest.fn();

    authUser(req, crearRes(), next);

    expect(req.userId).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
});

test('Deja req.userId en null cuando body y query no existen', () => {
    const req = { header: jest.fn().mockReturnValue(null) };
    const next = jest.fn();

    authUser(req, crearRes(), next);

    expect(req.userId).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
});

test('Llama a next siempre, incluso con un id valido', () => {
    const req = crearReq({ header: ID_VALIDO });
    const next = jest.fn();

    authUser(req, crearRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
});
