const { parseTrustProxy } = require("../src/config/trustProxy");

describe("parseTrustProxy", () => {
  test("sin configurar no toca la app", () => {
    expect(parseTrustProxy(undefined)).toBeNull();
    expect(parseTrustProxy("")).toBeNull();
  });

  test("false desactiva el trust proxy", () => {
    expect(parseTrustProxy("false")).toBe(false);
  });

  test("true confía en todos los proxies", () => {
    expect(parseTrustProxy("true")).toBe(true);
  });

  test("un número es la cantidad de saltos confiables", () => {
    expect(parseTrustProxy("2")).toBe(2);
  });

  test("una lista o nombre de subred se pasa tal cual", () => {
    expect(parseTrustProxy("loopback")).toBe("loopback");
    expect(parseTrustProxy("10.0.0.0/8,172.16.0.0/12")).toBe(
      "10.0.0.0/8,172.16.0.0/12",
    );
  });

  test("app.js aplica TRUST_PROXY al arrancar", () => {
    const previous = process.env.TRUST_PROXY;
    process.env.TRUST_PROXY = "2";

    let app;
    jest.isolateModules(() => {
      app = require("../src/app");
    });

    expect(app.get("trust proxy")).toBe(2);

    if (previous === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous;
  });
});
