import { NextRequest, NextResponse } from 'next/server';

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url, token });
}

export async function GET() {
  try {
    const redis = await getRedis();
    if (!redis) {
      return NextResponse.json([]); // no database configured: nothing has been recorded
    }

    const history = await redis.get<any[]>('elysiq:scan:history') || [];
    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Error fetching scan history:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // Admin only (the history feeds Stache Pass claims): fails closed until CRON_SECRET is set.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const redis = await getRedis();
    if (!redis) {
      return NextResponse.json({ error: 'Redis configuration missing' }, { status: 500 });
    }

    await redis.set('elysiq:scan:history', []);
    return NextResponse.json({ ok: true, message: 'Scan history cleared successfully' });
  } catch (error: any) {
    console.error('Error clearing scan history:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
