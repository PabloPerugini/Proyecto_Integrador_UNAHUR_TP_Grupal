const { userSchema, userUpdateSchema } = require("../src/schemas/user.schemas");

const usuarioValido = {
    nickName: "Pepe",
    firstName: "Pepe",
    lastName: "Gonzalez",
    email: "pepe.gonzalez@ejemplo.com",
    password: "123456",
}

describe("userSchema", () => {
    test("acepta un usuario válido", () => {
        const { error } = userSchema.validate(usuarioValido);
        expect(error).toBeUndefined();
    });

    test("Convierte el mail a minúsculas", () => {
        const { value } = userSchema.validate({ ...usuarioValido, email: "PEPE.GONZALEZ@EJEMPLO.COM" });
        expect(value.email).toBe("pepe.gonzalez@ejemplo.com");
    });

    test("Rechaza un email sin arroba", () => {
        const { error } = userSchema.validate({ ...usuarioValido,email: "pepe.gonzalezejemplo.com" });
        expect(error.details[0].message).toBe("Email inválido");
    });

    test("Rechaza una contraseña de menos de 6 caracteres", () => {
        const { error } = userSchema.validate({ ...usuarioValido, password: "12345" });
        expect(error.details[0].message).toBe("La contraseña debe tener al menos 6 caracteres");
    });

    test("Rechaza una contraseña de más de 72 caracteres", () => {
        const { error } = userSchema.validate({ ...usuarioValido, password: "a".repeat(73) });
        expect(error).toBeDefined();
    });

    test("Exige el nickName", () => {
        const { nickName, ...sinNick } = usuarioValido;
        const { error } = userSchema.validate(sinNick);
        expect(error.details[0].message).toBe("Nickname es obligatorio");
    });

    test("Rechaza un nombre vacío", () => {
        const { error } = userSchema.validate({ ...usuarioValido, firstName: "" });
        expect(error.details[0].message).toBe("El nombre es obligatorio");
    });

    test("Rechaza un nombre de un solo carácter", () => {
        const { error } = userSchema.validate({ ...usuarioValido, firstName: "J" });
        expect(error).toBeDefined();
    });

    test("Rechaza un apellido vacío", () => {
        const { error } = userSchema.validate({ ...usuarioValido, lastName: "" });
        expect(error.details[0].message).toBe("El apellido es obligatorio");
    });
});

describe("userUpdateSchema", () => {
    test("Acepta un objeto vacio porque todos los campos son opcionales", () => {
        const { error } = userUpdateSchema.validate({});
        expect(error).toBeUndefined();
    }); 

    test("Acepta cambiar solo el nombre", () => {
        const { error } = userUpdateSchema.validate({ firstName: "Juan" });
        expect(error).toBeUndefined();
    });

    test("Acepta cambiar solo el apellido", () => {
        const { error } = userUpdateSchema.validate({ lastName: "Pérez" });
        expect(error).toBeUndefined();
    });

    test("Acepta cambiar solo el email", () => {
        const { error } = userUpdateSchema.validate({ email: "juan.perez123@ejemplo.com" });
        expect(error).toBeUndefined();
    });

    test("Rechaza un email invalido", () => {
        const { error } = userUpdateSchema.validate({ email: "juan.perezejemplo" });
        expect(error).toBeDefined();
    });


});