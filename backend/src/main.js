const app = require("./app");
const { connectMongo } = require("./config/mongo");
const cache = require("./config/redisClient");

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectMongo();
  } catch (error) {
    console.error("No se pudo conectar a MongoDB:", error.message);
    process.exit(1);
  }

  cache.connect().catch(() => {});

  const server = app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });

  server.on("error", (error) => {
    console.error("Error al iniciar el servidor:", error.message);
    process.exit(1);
  });
}

process.on("unhandledRejection", (reason) => {
  console.error("Promesa rechazada sin manejar:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Excepción no capturada:", error);
});

start();