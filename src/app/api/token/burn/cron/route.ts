import { NextRequest, NextResponse } from 'next/server';
import { syncBurnLogs } from '@/lib/chain/burnStats';

export const dynamic = 'force-dynamic';

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url, token });
}

/** Syncs FeePaid / BuybackBurned events from Elysium into the burn history. */
async function handleCron(req: NextRequest) {
  // Fail closed: the endpoint is unusable until CRON_SECRET is configured.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const redis = await getRedis();
  if (!redis) {
    return NextResponse.json({ error: 'Redis is not configured' }, { status: 500 });
  }

  const lockKey = 'elysiq:sync:lock';
  const acquired = await redis.set(lockKey, 'locked', { nx: true, ex: 300 });
  if (acquired === null) {
    return NextResponse.json({ success: false, message: 'Sync already in progress.' });
  }

  try {
    const result = await syncBurnLogs(redis as any);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[burn-cron] sync failed:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  } finally {
    await redis.del(lockKey);
  }
}

export async function GET(req: NextRequest) { return handleCron(req); }
export async function POST(req: NextRequest) { return handleCron(req); }
