const test = require("node:test");
const assert = require("node:assert/strict");
const { userSchema, userUpdateSchema } = require("../src/schemas/user.schemas");

const base = {
  nickName: "PabloUser",
  firstName: "Pablo",
  lastName: "Perugini",
  email: "pablo@example.com",
};

test("registro: 5 caracteres se rechaza (mínimo 6)", () => {
  const { error } = userSchema.validate({ ...base, password: "12345" });
  assert.ok(error, "se esperaba error de validación");
  assert.ok(
    error.details.some((d) => d.message.includes("6 caracteres")),
    "el mensaje debe indicar 6 caracteres",
  );
});

test("registro: 6 caracteres se acepta", () => {
  const { error, value } = userSchema.validate({ ...base, password: "123456" });
  assert.equal(error, undefined);
  assert.equal(value.password, "123456");
});

test("registro: email inválido se rechaza", () => {
  const { error } = userSchema.validate({ ...base, email: "no-es-email", password: "123456" });
  assert.ok(error);
  assert.ok(error.details.some((d) => d.message.includes("Email")));
});

test("registro: nickName vacío se rechaza", () => {
  const { error } = userSchema.validate({ ...base, nickName: "", password: "123456" });
  assert.ok(error);
  assert.ok(error.details.some((d) => d.message.includes("Nickname")));
});

test("actualización: todos los campos son opcionales", () => {
  const { error, value } = userUpdateSchema.validate({ firstName: "Pablo" });
  assert.equal(error, undefined);
  assert.equal(value.firstName, "Pablo");
});
