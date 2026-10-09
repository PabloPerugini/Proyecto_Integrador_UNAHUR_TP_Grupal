const UserProgress = require('../models/userprogress');
const Subject = require('../models/subject');
const { parseAcademicHistory } = require('../services/pdfParser.service');
const { parseHistory, saveProgress, getProgress } = require('./progress.controllers');

jest.mock('../models/userprogress', () => ({
    bulkWrite: jest.fn(),
    find: jest.fn(),
}));

jest.mock('../models/subject', () => ({
    find: jest.fn(),
}));

jest.mock('../services/pdfParser.service', () => ({
    parseAcademicHistory: jest.fn(),
}));

const crearRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// Cadena tipo consulta de mongoose: find().select().sort() -> promesa con los datos
const cadenaConSort = (valor) => {
    const cadena = {};
    cadena.select = jest.fn().mockReturnValue(cadena);
    cadena.sort = jest.fn().mockReturnValue(Promise.resolve(valor));
    return cadena;
};

// Cadena tipo consulta corta: find().select() -> promesa con los datos
const cadenaSoloSelect = (valor) => {
    const cadena = {};
    cadena.select = jest.fn().mockReturnValue(Promise.resolve(valor));
    return cadena;
};

// Cadena que falla al resolver (simula error de base de datos)
const cadenaQueFalla = (mensaje) => {
    const cadena = {};
    cadena.select = jest.fn().mockReturnValue(cadena);
    cadena.sort = jest.fn().mockReturnValue(Promise.reject(new Error(mensaje)));
    return cadena;
};

beforeEach(() => {
    jest.resetAllMocks();
});

test('parseHistory responde 200 con las materias detectadas', async () => {
    parseAcademicHistory.mockResolvedValue({
        sourceKind: 'siu-guarani',
        careerHint: 'Tecnicatura en Desarrollo de Software',
        subjects: [{ code: 'A1', nombre: 'Matemática I' }],
    });
    const req = { file: { buffer: Buffer.from('pdf de prueba') } };
    const res = crearRes();

    await parseHistory(req, res);

    const respuesta = res.json.mock.calls[0][0];
    expect(parseAcademicHistory).toHaveBeenCalledWith(req.file.buffer);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(respuesta.sourceKind).toBe('siu-guarani');
    expect(respuesta.careerHint).toBe('Tecnicatura en Desarrollo de Software');
    expect(respuesta.subjects).toHaveLength(1);
    expect(respuesta.detectedCount).toBe(1);
});

test('parseHistory devuelve detectedCount 0 si el parseo viene vacio', async () => {
    parseAcademicHistory.mockResolvedValue({ sourceKind: 'otro', careerHint: null, subjects: [] });
    const req = { file: { buffer: Buffer.from('pdf vacio') } };
    const res = crearRes();

    await parseHistory(req, res);

    const respuesta = res.json.mock.calls[0][0];
    expect(res.status).toHaveBeenCalledWith(200);
    expect(respuesta.subjects).toEqual([]);
    expect(respuesta.detectedCount).toBe(0);
});

test('parseHistory responde 400 si no viene el archivo', async () => {
    const req = {};
    const res = crearRes();

    await parseHistory(req, res);

    expect(parseAcademicHistory).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Enviá el PDF en el campo 'file'" });
});

test('parseHistory responde 500 si el parser falla', async () => {
    parseAcademicHistory.mockRejectedValue(new Error('PDF corrupto'));
    const req = { file: { buffer: Buffer.from('malisimo') } };
    const res = crearRes();

    await parseHistory(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error al parsear el PDF', error: 'PDF corrupto' });
});

test('saveProgress guarda las entradas y responde 200 con la cantidad guardada', async () => {
    UserProgress.bulkWrite.mockResolvedValue({ upsertedCount: 1, modifiedCount: 2 });
    const req = {
        userId: 'user-1',
        body: {
            careerId: 'carr-1',
            entries: [
                { subjectCode: 'A1', status: 'Aprobada', nota: 9, fecha: '2024-05-10', origen: 'pdf', extraRequires: [7, 8] },
            ],
        },
    };
    const res = crearRes();

    await saveProgress(req, res);

    const operaciones = UserProgress.bulkWrite.mock.calls[0][0];
    const primera = operaciones[0].updateOne;
    const respuesta = res.json.mock.calls[0][0];
    expect(primera.filter).toEqual({ userId: 'user-1', careerId: 'carr-1', subjectCode: 'A1' });
    expect(primera.update.$set.status).toBe('Aprobada');
    expect(primera.update.$set.extraRequires).toEqual(['7', '8']);
    expect(primera.update.$set.fecha).toBeInstanceOf(Date);
    expect(primera.upsert).toBe(true);
    expect(UserProgress.bulkWrite).toHaveBeenCalledWith(operaciones, { ordered: false });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(respuesta).toEqual({ saved: 3 });
});

test('saveProgress normaliza status, fecha y extraRequires invalidos', async () => {
    UserProgress.bulkWrite.mockResolvedValue({ upsertedCount: 0, modifiedCount: 1 });
    const req = {
        userId: 'user-1',
        body: {
            careerId: 'carr-1',
            entries: [{ subjectCode: 'A2', status: 'Matriculada', fecha: 'no-es-fecha', extraRequires: 'no-array' }],
        },
    };
    const res = crearRes();

    await saveProgress(req, res);

    const set = UserProgress.bulkWrite.mock.calls[0][0][0].updateOne.update.$set;
    expect(set.status).toBe('Pendiente');
    expect(set.fecha).toBeNull();
    expect(set.extraRequires).toEqual([]);
    expect(set.nota).toBeNull();
    expect(res.status).toHaveBeenCalledWith(200);
});

test('saveProgress responde 401 si falta identificar al usuario', async () => {
    const req = { body: { careerId: 'carr-1', entries: [{ subjectCode: 'A1' }] } };
    const res = crearRes();

    await saveProgress(req, res);

    expect(UserProgress.bulkWrite).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Falta identificar al usuario (x-user-id)' });
});

test('saveProgress responde 400 si falta careerId', async () => {
    const req = { userId: 'user-1', body: { entries: [{ subjectCode: 'A1' }] } };
    const res = crearRes();

    await saveProgress(req, res);

    expect(UserProgress.bulkWrite).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Enviá careerId y un arreglo de entradas' });
});

test('saveProgress responde 400 si las entradas estan vacias o no son un arreglo', async () => {
    const req = { userId: 'user-1', body: { careerId: 'carr-1', entries: [] } };
    const res = crearRes();

    await saveProgress(req, res);

    expect(UserProgress.bulkWrite).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
});

test('saveProgress responde 500 si falla el bulkWrite', async () => {
    UserProgress.bulkWrite.mockRejectedValue(new Error('fallo de base de datos'));
    const req = { userId: 'user-1', body: { careerId: 'carr-1', entries: [{ subjectCode: 'A1' }] } };
    const res = crearRes();

    await saveProgress(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error al guardar el progreso', error: 'fallo de base de datos' });
});

test('getProgress devuelve las entradas sin resumen cuando no hay careerId', async () => {
    const entradas = [{ subjectCode: 'A1', status: 'Aprobada' }];
    UserProgress.find.mockReturnValueOnce(cadenaConSort(entradas));
    const req = { userId: 'user-1', query: {} };
    const res = crearRes();

    await getProgress(req, res);

    const respuesta = res.json.mock.calls[0][0];
    expect(UserProgress.find).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(Subject.find).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(respuesta.entries).toEqual(entradas);
    expect(respuesta.summary).toBeNull();
});

test('getProgress devuelve el resumen de creditos cuando hay careerId', async () => {
    const entradas = [{ subjectCode: 'A1', status: 'Aprobada' }];
    const progreso = [
        { subjectCode: 'A1', status: 'Aprobada' },
        { subjectCode: 'A2', status: 'Cursando' },
        { subjectCode: 'ZZ', status: 'Aprobada' },
    ];
    const materias = [{ code: 'A1', credits: 6 }, { code: 'A2', credits: 4 }];
    UserProgress.find
        .mockReturnValueOnce(cadenaConSort(entradas))
        .mockReturnValueOnce(cadenaSoloSelect(progreso));
    Subject.find.mockReturnValue({ select: jest.fn().mockResolvedValue(materias) });
    const req = { userId: 'user-1', query: { careerId: 'carr-1' } };
    const res = crearRes();

    await getProgress(req, res);

    const respuesta = res.json.mock.calls[0][0];
    expect(UserProgress.find).toHaveBeenCalledWith({ userId: 'user-1', careerId: 'carr-1' });
    expect(Subject.find).toHaveBeenCalledWith({ careerId: 'carr-1' });
    expect(respuesta.entries).toEqual(entradas);
    expect(respuesta.summary).toEqual({ creditsTotal: 10, creditsAprobados: 6, aprobadas: 2, total: 2 });
});

test('getProgress responde 401 si falta identificar al usuario', async () => {
    const req = { query: {} };
    const res = crearRes();

    await getProgress(req, res);

    expect(UserProgress.find).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Falta identificar al usuario (x-user-id)' });
});

test('getProgress responde 500 si falla la busqueda de entradas', async () => {
    UserProgress.find.mockReturnValueOnce(cadenaQueFalla('fallo de base de datos'));
    const req = { userId: 'user-1', query: {} };
    const res = crearRes();

    await getProgress(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error al obtener el progreso', error: 'fallo de base de datos' });
});

test('getProgress responde 500 si falla el calculo del resumen', async () => {
    const entradas = [{ subjectCode: 'A1', status: 'Aprobada' }];
    UserProgress.find.mockReturnValueOnce(cadenaConSort(entradas));
    UserProgress.find.mockReturnValueOnce(cadenaSoloSelect([]));
    Subject.find.mockReturnValue({ select: jest.fn().mockRejectedValue(new Error('fallo el resumen')) });
    const req = { userId: 'user-1', query: { careerId: 'carr-1' } };
    const res = crearRes();

    await getProgress(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error al obtener el progreso', error: 'fallo el resumen' });
});
