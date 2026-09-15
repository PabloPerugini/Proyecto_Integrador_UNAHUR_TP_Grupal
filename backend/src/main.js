const app = require("./app");
const { connectMongo } = require("./config/mongo");
const cache = require("./config/redisClient");

const PORT = process.env.PORT || 3000;

async function start() {
  await connectMongo();

  cache.connect().catch(() => {});

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

start();