const { aiRateLimitKey } = require("../src/middlewares/rateLimitAi");

describe("aiRateLimitKey", () => {
  test("usa el usuario autenticado e ignora el header x-user-id", () => {
    const key = aiRateLimitKey({
      user: { _id: "64b000000000000000000001" },
      headers: { "x-user-id": "atacante" },
      ip: "203.0.113.10",
    });

    expect(key).toBe("user:64b000000000000000000001");
  });

  test("sin usuario cae a la IP normalizada", () => {
    const key = aiRateLimitKey({
      headers: { "x-user-id": "atacante" },
      ip: "203.0.113.10",
    });

    expect(key).toBe("203.0.113.10");
  });

  test("normaliza IPv6 para que no se evade cambiando de sufijo", () => {
    const a = aiRateLimitKey({ ip: "2001:db8:1:2:3:4:5:6" });
    const b = aiRateLimitKey({ ip: "2001:db8:1:2:ffff:ffff:ffff:ffff" });

    expect(a).toBe(b);
  });
});
