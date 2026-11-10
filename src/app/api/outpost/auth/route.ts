import { NextResponse } from 'next/server';

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url, token });
}

export async function GET() {
  const nonce = 'nonce_' + crypto.randomUUID();
  
  const redis = await getRedis();
  if (redis) {
    // Expire in 5 minutes (300 seconds)
    await redis.set(`elysiq:nonce:${nonce}`, { nonce, expires: Date.now() + 300000 }, { ex: 300 });
  } else {
    // Fallback for local without redis
    const globalNonces = (globalThis as any).NONCES || new Map();
    globalNonces.set(nonce, { nonce, expires: Date.now() + 300000 });
    (globalThis as any).NONCES = globalNonces;
  }

  return NextResponse.json({ nonce });
}
