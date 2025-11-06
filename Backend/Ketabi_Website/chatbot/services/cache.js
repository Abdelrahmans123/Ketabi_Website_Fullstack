import redis from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const CACHE_TTL = {
  embedding: 86400, 
  search: 3600,
  aiResponse: 1800, 
};

let redisClient = null;
let isConnected = false;


async function initRedis() {
  if (isConnected) return redisClient;

  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error(' Redis reconnection failed after 10 attempts');
            return new Error('Redis max retries exceeded');
          }
          return retries * 100;
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error(' Redis Client Error:', err.message);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log(' Redis Connected');
      isConnected = true;
    });

    await redisClient.connect();
    console.log(' Redis client initialized');
    return redisClient;

  } catch (error) {
    console.error(' Redis initialization error:', error.message);
    console.warn(' Proceeding without Redis cache');
    return null;
  }
}

function generateCacheKey(prefix, data) {

  const hash = Buffer.from(JSON.stringify(data)).toString('base64').substring(0, 32);
  return `${prefix}:${hash}`;
}

export async function getFromCache(prefix, key) {
  try {
    const client = await initRedis();
    if (!client || !isConnected) return null;

    const cacheKey = generateCacheKey(prefix, key);
    const cached = await client.get(cacheKey);

    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return JSON.parse(cached);
    }

    console.log(`Cache MISS: ${cacheKey}`);
    return null;

  } catch (error) {
    console.error('Cache get error:', error.message);
    return null; 
  }
}

export async function saveToCache(prefix, key, value, ttl) {
  try {
    const client = await initRedis();
    if (!client || !isConnected) return false;

    const cacheKey = generateCacheKey(prefix, key);
    const cacheTTL = ttl || CACHE_TTL[prefix] || 3600;

    await client.setEx(cacheKey, cacheTTL, JSON.stringify(value));
    console.log(` Cached: ${cacheKey} (TTL: ${cacheTTL}s)`);
    return true;

  } catch (error) {
    console.error(' Cache set error:', error.message);
    return false; 
  }
}

export async function clearCache(pattern) {
  try {
    const client = await initRedis();
    if (!client || !isConnected) return false;

    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      console.log(` Cleared ${keys.length} cache entries`);
    }

    return true;

  } catch (error) {
    console.error(' Cache clear error:', error.message);
    return false;
  }
}


export async function getCacheStats() {
  try {
    const client = await initRedis();
    if (!client || !isConnected) return null;

    const info = await client.info('memory');
    return {
      status: 'connected',
      memory: info,
      connected: isConnected,
    };

  } catch (error) {
    return { status: 'disconnected', error: error.message };
  }
}
