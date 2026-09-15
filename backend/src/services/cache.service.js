const cache = require("../config/redisClient");

const getCache = async (key) => {
  if (!cache.isReady) return null;
  try {
    return await cache.get(key);
  } catch (error) {
    return null;
  }
};

const setCache = async (key, value, ttlSec = 300) => {
  if (!cache.isReady) return;
  try {
    await cache.set(key, JSON.stringify(value), { EX: ttlSec });
  } catch (error) {
    // best-effort: nunca romper la API por el caché
  }
};

const invalidateCache = async (keys) => {
  if (!cache.isReady) return;
  try {
    await cache.del(keys);
  } catch (error) {
    // best-effort: nunca romper la API por el caché
  }
};

module.exports = { getCache, setCache, invalidateCache };