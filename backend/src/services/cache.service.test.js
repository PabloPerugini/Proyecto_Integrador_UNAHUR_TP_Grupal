jest.mock('../config/redisClient', () => ({
    isReady: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
}));

const cache = require('../config/redisClient');
const { getCache, setCache, invalidateCache } = require('./cache.service');

beforeEach(() => {
    jest.clearAllMocks();
    cache.isReady = false;
});

test('getCache devuelve null si redis no esta listo', async () => {
    cache.isReady = false;

    const resultado = await getCache('usuarios');

    expect(resultado).toBeNull();
    expect(cache.get).not.toHaveBeenCalled();
});

test('setCache no llama a redis si no esta listo', async () => {
    cache.isReady = false;

    await setCache('usuarios', [{ nickName: 'lucia' }]);

    expect(cache.set).not.toHaveBeenCalled();
});

test('invalidateCache no llama a redis si no esta listo', async () => {
    cache.isReady = false;

    await invalidateCache(['usuarios']);

    expect(cache.del).not.toHaveBeenCalled();
});

test('getCache devuelve el valor guardado cuando redis esta listo', async () => {
    cache.isReady = true;
    cache.get.mockResolvedValue('[{"nickName":"lucia"}]');

    const resultado = await getCache('usuarios');

    expect(cache.get).toHaveBeenCalledWith('usuarios');
    expect(resultado).toBe('[{"nickName":"lucia"}]');
});

test('setCache guarda el valor con JSON.stringify y el ttl en EX', async () => {
    cache.isReady = true;

    await setCache('usuarios', { nickName: 'lucia' }, 60);

    expect(cache.set).toHaveBeenCalledWith('usuarios', JSON.stringify({ nickName: 'lucia' }), { EX: 60 });
});

test('setCache usa el ttl por defecto de 300 segundos', async () => {
    cache.isReady = true;

    await setCache('usuarios', [1, 2, 3]);

    expect(cache.set).toHaveBeenCalledWith('usuarios', '[1,2,3]', { EX: 300 });
});

test('invalidateCache llama a del con las claves recibidas', async () => {
    cache.isReady = true;

    await invalidateCache(['usuarios', 'usuario:1']);

    expect(cache.del).toHaveBeenCalledWith(['usuarios', 'usuario:1']);
});

test('getCache devuelve null si redis lanza un error', async () => {
    cache.isReady = true;
    cache.get.mockRejectedValue(new Error('redis caido'));

    const resultado = await getCache('usuarios');

    expect(resultado).toBeNull();
});

test('setCache no rompe si redis lanza un error', async () => {
    cache.isReady = true;
    cache.set.mockRejectedValue(new Error('redis caido'));

    await expect(setCache('usuarios', { nickName: 'lucia' })).resolves.toBeUndefined();
});

test('invalidateCache no rompe si redis lanza un error', async () => {
    cache.isReady = true;
    cache.del.mockRejectedValue(new Error('redis caido'));

    await expect(invalidateCache(['usuarios'])).resolves.toBeUndefined();
});
