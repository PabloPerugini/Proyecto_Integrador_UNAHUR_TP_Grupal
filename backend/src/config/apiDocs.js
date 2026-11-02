// Swagger queda apagado por defecto en producción: expone la superficie
// completa de la API sin autenticación. En desarrollo sigue disponible.
// API_DOCS_ENABLED=true/false fuerza el valor en cualquier entorno.
function apiDocsEnabled() {
  if (process.env.API_DOCS_ENABLED !== undefined) {
    return process.env.API_DOCS_ENABLED === "true";
  }
  return process.env.NODE_ENV !== "production";
}

module.exports = { apiDocsEnabled };
