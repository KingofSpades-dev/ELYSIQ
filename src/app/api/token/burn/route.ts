import { NextResponse } from 'next/server';
import { getBurnHistory, getBurnTotals } from '@/lib/chain/burnStats';

export const dynamic = 'force-dynamic';

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url, token });
}

/**
 * Public, read-only burn statistics read straight from Elysium.
 * Burns and buybacks are executed on-chain by the ElysiqFeeRouter (see contracts/); there is
 * deliberately no public POST here that could move treasury funds.
 */
export async function GET() {
  try {
    const [totals, history] = await Promise.all([getBurnTotals(), getBurnHistory(await getRedis())]);
    return NextResponse.json({
      total_burned: totals.total_burned,
      treasury_balance: totals.treasury_balance,
      escrow_balance: totals.escrow_balance,
      history,
    });
  } catch (error: any) {
    console.error('Error fetching burn stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
