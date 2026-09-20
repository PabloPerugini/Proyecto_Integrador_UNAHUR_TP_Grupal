const app = require("./app");
const { connectMongo } = require("./config/mongo");
const cache = require("./config/redisClient");

const PORT = process.env.PORT || 3000;

async function start() {
  await connectMongo();

  cache.connect().catch(() => {});

  app.listen(PORT, () => {
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

start();