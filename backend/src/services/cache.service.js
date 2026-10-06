const cache = require("../config/redisClient");

// 1B.A2: cuando Redis está caído (típico en local), el caché seguía "funcionando"
// pero devolvía siempre miss y cada parse repetía la llamada a la IA pagada.
// Este Map es un respaldo best-effort con el mismo contrato: si Redis vuelve,
// se prefiere Redis y el Map solo aporta lo que Redis no tiene.
const memory = new Map(); // key -> { value, expiresAt }

const memGet = (key) => {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
};

const memSet = (key, value, ttlSec) => {
  // tope de entradas para no crecer sin límite si Redis sigue caído
  if (memory.size >= 200) {
    const oldest = memory.keys().next().value;
    memory.delete(oldest);
  }
  memory.set(key, { value, expiresAt: ttlSec ? Date.now() + ttlSec * 1000 : null });
};

const getCache = async (key) => {
  if (cache.isReady) {
    try {
      const hit = await cache.get(key);
      if (hit != null) return hit;
    } catch (error) {
      // cae al respaldo en memoria
    }
  }
  return memGet(key);
};

const setCache = async (key, value, ttlSec = 300) => {
  const serialized = JSON.stringify(value);
  memSet(key, serialized, ttlSec);
  if (!cache.isReady) return;
  try {
    await cache.set(key, serialized, { EX: ttlSec });
  } catch (error) {
    // best-effort: nunca romper la API por el caché
  }
};

module.exports = { getCache, setCache };
