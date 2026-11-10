// src/lib/soul/session.ts

// In-memory fallback used when Redis is not configured (local development).
// Kept on globalThis because each route can get its own copy of this module in dev; production must use Redis.
type SessionData = { wallet: string; tier: number; expires: number };
const g = globalThis as typeof globalThis & { __ELYSIQ_SESSIONS?: Map<string, SessionData> };
const GLOBAL_SESSIONS: Map<string, SessionData> = (g.__ELYSIQ_SESSIONS ??= new Map());

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

export async function getSession(sessionId: string) {
  const redis = await getRedis();
  if (redis) {
    try {
      return await redis.get<{ wallet: string; tier: number; expires: number }>(`elysiq:session:${sessionId}`);
    } catch {
      return null;
    }
  }
  
  // Fallback to shared global sessions map
  const session = GLOBAL_SESSIONS.get(sessionId);
  if (session && session.expires > Date.now()) {
    return session;
  }
  if (session) {
    GLOBAL_SESSIONS.delete(sessionId);
  }
  return null;
}

export async function saveSession(
  sessionId: string, 
  sessionData: { wallet: string; tier: number; expires: number }
) {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(`elysiq:session:${sessionId}`, sessionData, { ex: 3600 });
      return;
    } catch (err) {
      console.error("[SESSION] Redis write failed, falling back to In-Memory:", err);
    }
  }
  GLOBAL_SESSIONS.set(sessionId, sessionData);
}

export async function deleteSession(sessionId: string) {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.del(`elysiq:session:${sessionId}`);
      return;
    } catch {}
  }
  GLOBAL_SESSIONS.delete(sessionId);
}
