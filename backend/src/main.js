require("./config/env");
const app = require("./app");
const { connectMongo, disconnectMongo } = require("./config/mongo");
const cache = require("./config/redisClient");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 3000;

let server = null;
let shuttingDown = false;

async function start() {
  await connectMongo();

  cache.connect().catch(() => {});

  server = app.listen(PORT, () => {
    console.log(`
=====================================
Gradify iniciado correctamente

Frontend:
http://localhost:5173

Backend:
http://localhost:${PORT}

MongoDB:
mongodb://localhost:27017/unahur-tp

Redis:
localhost:6380
=====================================
`);
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nRecibida señal ${signal}, cerrando servidor...`);

  const force = setTimeout(() => {
    console.error("El apagado demoró demasiado, forzando salida.");
    process.exit(1);
  }, 10000);
  force.unref();

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close(resolve);
        server.closeAllConnections?.();
      });
    }
    await disconnectMongo();
    if (cache.isOpen) {
      await cache.quit();
    }
    console.log("Apagado correcto.");
    process.exit(0);
  } catch (error) {
    console.error("Error durante el apagado:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Promesa rechazada sin manejar:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Excepción no capturada:", error);
});

start().catch((error) => {
  console.error("Error al iniciar el servidor:", error);
  process.exit(1);
});