const AppError = require('../src/utils/AppError');

describe('AppError', () => {
    test("Guarda el estado, el mensaje y los detalles", () => {
        const error = new AppError(404, "No encontrado", "detalle del error"); 
        expect(error.status).toBe(404);
        expect(error.message).toBe("No encontrado");
        expect(error.details).toBe("detalle del error");
    });

    test("Es una instancia de Error", () => {
        const error = new AppError(400, "Mal pedido");
        expect(error instanceof Error).toBe(true);
    });
    
    test("detalle queda indefinido si no se pasa", () => {
        const error = new AppError(500, "Mal pedido");
        expect(error.details).toBeUndefined();
    });
});