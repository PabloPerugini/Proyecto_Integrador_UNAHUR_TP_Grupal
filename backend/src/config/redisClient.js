const { createClient } = require("redis");
require("dotenv").config();

const cache = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  disableOfflineQueue: true,
  socket: {
    connectTimeout: 2000,
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
});

cache.on("error", (error) => {
  console.error(`Redis: Offline (${error.code || error.message})`);
});

cache.on("ready", () => {
  console.log("Redis: Conectado");
});

module.exports = cache;