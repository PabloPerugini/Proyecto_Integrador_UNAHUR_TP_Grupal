const { userSchema } = require('./user.schemas');

test('Un usuario valido no tiene errores de validacion', () => {
    const resultado = userSchema.validate({
        nickName: 'ana123',
        firstName: 'Ana',
        lastName: 'Perez',
        email: 'ana@mail.com',
        password: '1234',
    });
    expect(resultado.error).toBeFalsy();
});

test('Falla si falta el nickName', () => {
    const resultado = userSchema.validate({
        email: 'ana@mail.com',
        password: '1234',
    });
    expect(resultado.error).toBeTruthy();
    expect(resultado.error.details[0].message).toBe('NickName es obligatorio');
});

test('Falla si falta el email', () => {
    const resultado = userSchema.validate({
        nickName: 'ana123',
        password: '1234',
    });
    expect(resultado.error).toBeTruthy();
    expect(resultado.error.details[0].message).toBe('Email es obligatorio');
});

test('Falla si el email no es valido', () => {
    const resultado = userSchema.validate({
        nickName: 'ana123',
        email: 'no-es-un-email',
        password: '1234',
    });
    expect(resultado.error).toBeTruthy();
    expect(resultado.error.details[0].message).toBe('Email inválido');
});

test('Falla si el password tiene menos de 4 caracteres', () => {
    const resultado = userSchema.validate({
        nickName: 'ana123',
        email: 'ana@mail.com',
        password: '123',
    });
    expect(resultado.error).toBeTruthy();
    expect(resultado.error.details[0].type).toBe('string.min');
});

test('Si no viene password se completa con el valor por defecto 123456', () => {
    const resultado = userSchema.validate({
        nickName: 'ana123',
        email: 'ana@mail.com',
    });
    expect(resultado.error).toBeFalsy();
    expect(resultado.value.password).toBe('123456');
});

test('El firstName vacio es valido', () => {
    const resultado = userSchema.validate({
        nickName: 'ana123',
        firstName: '',
        email: 'ana@mail.com',
        password: '1234',
    });
    expect(resultado.error).toBeFalsy();
});
