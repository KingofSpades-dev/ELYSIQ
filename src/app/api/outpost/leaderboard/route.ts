import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/outpost/db';

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url, token });
}

async function getSession(req: NextRequest) {
  const sessionId = req.cookies.get('elysiq_session_id')?.value;
  if (!sessionId) return null;

  const redis = await getRedis();
  if (redis) {
    return await redis.get<any>(`elysiq:session:${sessionId}`);
  }
  const globalSessions = (globalThis as any).SESSIONS;
  return globalSessions?.get(sessionId) || null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.expires < Date.now()) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const fullLeaderboard = await getLeaderboard();
    const top15 = fullLeaderboard.slice(0, 15);

    const userIndex = fullLeaderboard.findIndex(
      p => p.walletAddress.toLowerCase() === session.wallet.toLowerCase()
    );

    let userRank = null;
    if (userIndex !== -1 && userIndex >= 15) {
      userRank = {
        rank: userIndex + 1,
        player: fullLeaderboard[userIndex]
      };
    }

    return NextResponse.json({ leaderboard: top15, userRank });
  } catch (err: any) {
    console.error('[outpost-leaderboard] Failed to fetch leaderboard:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
