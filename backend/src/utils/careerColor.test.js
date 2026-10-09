const { deriveCareerColor } = require('./careerColor');

test ('Devuelve el color fijo para un intituto conocido', () => {
    const color = deriveCareerColor('Biotecnologia', 'Cualquier carrera');
    expect(color).toBe('#219ecf');
});

test ('Usa un color de respaldo para un instituto ', () => {
    const color = deriveCareerColor('Arte', 'Cualquier carrera');
    expect(color).toBe('#ea4f51');
});

test ('No falla si no hay datos en los argunmentos', () => {
    const color = deriveCareerColor(null,null);
    expect(typeof color).toBe('string');
});