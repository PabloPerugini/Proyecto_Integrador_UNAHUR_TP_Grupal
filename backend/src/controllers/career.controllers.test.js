const Career = require('../models/career');
const Subject = require('../models/subject');
const UserProgress = require('../models/userprogress');
const { parseOfficialPlan } = require('../services/pdfParser.service');
const { getCareerSubjects, publishCareer, deleteCareer, parseOfficial } = require('./career.controllers');

jest.mock('../models/career', () => ({
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
}));

jest.mock('../models/subject', () => ({
    find: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
}));

jest.mock('../models/userprogress', () => ({
    deleteMany: jest.fn(),
}));

jest.mock('../services/pdfParser.service', () => ({
    parseOfficialPlan: jest.fn(),
    parseCorrelativas: jest.fn(),
}));

jest.mock('../services/graph.service', () => ({
    buildGraph: jest.fn(),
}));

const crearRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// Cadena tipo consulta de mongoose: find().sort().select() -> promesa con los datos
const cadenaMaterias = (valor) => {
    const cadena = {};
    cadena.sort = jest.fn().mockReturnValue(cadena);
    cadena.select = jest.fn().mockReturnValue(Promise.resolve(valor));
    return cadena;
};

// Cadena que falla al resolver (simula error de base de datos)
const cadenaMateriasQueFalla = (mensaje) => {
    const cadena = {};
    cadena.sort = jest.fn().mockReturnValue(cadena);
    cadena.select = jest.fn().mockReturnValue(Promise.reject(new Error(mensaje)));
    return cadena;
};

beforeEach(() => {
    jest.resetAllMocks();
});

test('getCareerSubjects responde 200 con las materias de la carrera', async () => {
    const materias = [{ name: 'Matemática I' }, { name: 'Física I' }];
    Subject.find.mockReturnValue(cadenaMaterias(materias));
    const req = { params: { id: 'carr-1' } };
    const res = crearRes();

    await getCareerSubjects(req, res);

    const cadena = Subject.find.mock.results[0].value;
    expect(Subject.find).toHaveBeenCalledWith({ careerId: 'carr-1' });
    expect(cadena.sort).toHaveBeenCalledWith({ year: 1, cuatrimestre: 1, name: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(materias);
});

test('getCareerSubjects responde 200 con una lista vacia si la carrera no tiene materias', async () => {
    Subject.find.mockReturnValue(cadenaMaterias([]));
    const req = { params: { id: 'carr-2' } };
    const res = crearRes();

    await getCareerSubjects(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
});

test('getCareerSubjects responde 500 si falla la busqueda de materias', async () => {
    Subject.find.mockReturnValue(cadenaMateriasQueFalla('fallo de base de datos'));
    const req = { params: { id: 'carr-1' } };
    const res = crearRes();

    await getCareerSubjects(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error al obtener las materias', error: 'fallo de base de datos' });
});

test('publishCareer responde 200 con la carrera publicada y su cantidad de materias', async () => {
    const publicada = { _id: 'carr-1', name: 'Tecnicatura en Software', status: 'published', subjectCount: 12 };
    Subject.countDocuments.mockResolvedValue(12);
    Career.findByIdAndUpdate.mockResolvedValue(publicada);
    const req = { params: { id: 'carr-1' } };
    const res = crearRes();

    await publishCareer(req, res);

    expect(Subject.countDocuments).toHaveBeenCalledWith({ careerId: 'carr-1' });
    expect(Career.findByIdAndUpdate).toHaveBeenCalledWith(
        'carr-1',
        { status: 'published', subjectCount: 12 },
        { returnDocument: 'after' },
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(publicada);
});

test('publishCareer responde 404 si la carrera no existe', async () => {
    Subject.countDocuments.mockResolvedValue(0);
    Career.findByIdAndUpdate.mockResolvedValue(null);
    const req = { params: { id: 'carr-inexistente' } };
    const res = crearRes();

    await publishCareer(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Carrera no encontrada' });
});

test('publishCareer responde 500 si falla el conteo de materias', async () => {
    Subject.countDocuments.mockRejectedValue(new Error('fallo de base de datos'));
    const req = { params: { id: 'carr-1' } };
    const res = crearRes();

    await publishCareer(req, res);

    expect(Career.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error al publicar la carrera', error: 'fallo de base de datos' });
});

test('deleteCareer responde 200 y borra la carrera con sus materias y progreso', async () => {
    const carrera = { _id: 'carr-1', name: 'Tecnicatura en Desarrollo de Software' };
    Career.findById.mockResolvedValue(carrera);
    Subject.deleteMany.mockResolvedValue({ deletedCount: 3 });
    UserProgress.deleteMany.mockResolvedValue({ deletedCount: 5 });
    Career.deleteOne.mockResolvedValue({ deletedCount: 1 });
    const req = { params: { id: 'carr-1' } };
    const res = crearRes();

    await deleteCareer(req, res);

    expect(Career.findById).toHaveBeenCalledWith('carr-1');
    expect(Subject.deleteMany).toHaveBeenCalledWith({ careerId: 'carr-1' });
    expect(UserProgress.deleteMany).toHaveBeenCalledWith({ careerId: 'carr-1' });
    expect(Career.deleteOne).toHaveBeenCalledWith({ _id: 'carr-1' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
        deleted: 'Tecnicatura en Desarrollo de Software',
        deletedId: 'carr-1',
    });
});

test('deleteCareer responde 404 si la carrera no existe', async () => {
    Career.findById.mockResolvedValue(null);
    const req = { params: { id: 'carr-inexistente' } };
    const res = crearRes();

    await deleteCareer(req, res);

    expect(Subject.deleteMany).not.toHaveBeenCalled();
    expect(Career.deleteOne).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Carrera no encontrada' });
});

test('deleteCareer responde 500 si falla la busqueda de la carrera', async () => {
    Career.findById.mockRejectedValue(new Error('fallo de base de datos'));
    const req = { params: { id: 'carr-1' } };
    const res = crearRes();

    await deleteCareer(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error al eliminar la carrera', error: 'fallo de base de datos' });
});

test('parseOfficial responde 200 con los datos detectados en el PDF', async () => {
    const materias = [{ code: 'A1', name: 'Matemática I' }, { code: 'A2', name: 'Física I' }];
    parseOfficialPlan.mockResolvedValue({
        sourceKind: 'siu-guarani',
        subjects: materias,
        intermediateTitle: 'Tecnicatura en Análisis de Sistemas',
        creditsFinal: 120,
        creditsIntermediate: 80,
    });
    const buffer = Buffer.from('pdf de prueba');
    const req = { file: { buffer } };
    const res = crearRes();

    await parseOfficial(req, res);

    const respuesta = res.json.mock.calls[0][0];
    expect(parseOfficialPlan).toHaveBeenCalledWith(buffer);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(respuesta.sourceKind).toBe('siu-guarani');
    expect(respuesta.subjects).toEqual(materias);
    expect(respuesta.detectedCount).toBe(2);
    expect(respuesta.intermediateTitle).toBe('Tecnicatura en Análisis de Sistemas');
    expect(respuesta.creditsFinal).toBe(120);
    expect(respuesta.creditsIntermediate).toBe(80);
});

test('parseOfficial devuelve valores por defecto cuando el parseo viene vacio', async () => {
    parseOfficialPlan.mockResolvedValue({ sourceKind: 'otro', subjects: [] });
    const req = { file: { buffer: Buffer.from('pdf vacio') } };
    const res = crearRes();

    await parseOfficial(req, res);

    const respuesta = res.json.mock.calls[0][0];
    expect(res.status).toHaveBeenCalledWith(200);
    expect(respuesta.subjects).toEqual([]);
    expect(respuesta.detectedCount).toBe(0);
    expect(respuesta.intermediateTitle).toBeNull();
    expect(respuesta.creditsFinal).toBe(0);
    expect(respuesta.creditsIntermediate).toBe(0);
});

test('parseOfficial responde 400 si no viene el archivo', async () => {
    const req = {};
    const res = crearRes();

    await parseOfficial(req, res);

    expect(parseOfficialPlan).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Enviá el PDF en el campo 'file'" });
});

test('parseOfficial responde 500 si el parser falla', async () => {
    parseOfficialPlan.mockRejectedValue(new Error('PDF corrupto'));
    const req = { file: { buffer: Buffer.from('malisimo') } };
    const res = crearRes();

    await parseOfficial(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error al parsear el PDF', error: 'PDF corrupto' });
});
