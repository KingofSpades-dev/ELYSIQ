import { NextResponse } from "next/server";

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import("@upstash/redis");
  return new Redis({ url, token });
}

export async function GET() {
  const redis = await getRedis();
  if (!redis) return NextResponse.json({ total: 0, week: 0 });
  const [total, week] = await Promise.all([
    redis.get<number>("elysiq:scans:total"),
    redis.get<number>("elysiq:scans:week"),
  ]);
  return NextResponse.json({ total: total || 0, week: week || 0 });
}

export async function POST() {
  const redis = await getRedis();
  if (!redis) return NextResponse.json({ ok: true });
  await Promise.all([
    redis.incr("elysiq:scans:total"),
    redis.incr("elysiq:scans:week"),
  ]);
  return NextResponse.json({ ok: true });
}
