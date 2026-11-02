const { apiDocsEnabled } = require("../src/config/apiDocs");

describe("apiDocsEnabled", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  test("en producción está deshabilitado por defecto", () => {
    delete process.env.API_DOCS_ENABLED;
    process.env.NODE_ENV = "production";
    expect(apiDocsEnabled()).toBe(false);
  });

  test("en desarrollo está habilitado por defecto", () => {
    delete process.env.API_DOCS_ENABLED;
    process.env.NODE_ENV = "development";
    expect(apiDocsEnabled()).toBe(true);
  });

  test("API_DOCS_ENABLED tiene prioridad explícita", () => {
    process.env.NODE_ENV = "production";
    process.env.API_DOCS_ENABLED = "true";
    expect(apiDocsEnabled()).toBe(true);
    process.env.API_DOCS_ENABLED = "false";
    expect(apiDocsEnabled()).toBe(false);
  });
});
