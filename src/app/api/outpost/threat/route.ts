import { NextRequest, NextResponse } from 'next/server';
import { getPlayer, savePlayer, getActiveHunt, saveActiveHunt, addHuntCall } from '@/lib/outpost/db';
import { OutpostHunt, OutpostHuntCall } from '@/lib/outpost/types';

const TICKERS = ['MOONX', 'PEPE9', 'SAFU2', 'GIGAW', 'WAGMI', 'FLOKI', 'CHAD', 'DEGEN', 'BONKD', 'APE3', 'TURBO', 'RUGME', 'HODL4', 'LAMBO'];

const HSIG: Record<string, { k: string; v: string; cls: 'good' | 'bad' | 'warn'; rug: number }> = {
  mintActive: { k: 'MINT', v: 'ACTIVE', cls: 'bad', rug: 1 },
  mintRev: { k: 'MINT', v: 'REVOKED', cls: 'good', rug: 0 },
  freezeActive: { k: 'FREEZE', v: 'ACTIVE', cls: 'bad', rug: 1 },
  freezeRev: { k: 'FREEZE', v: 'REVOKED', cls: 'good', rug: 0 },
  lpLock: { k: 'LP', v: 'LOCKED', cls: 'good', rug: 0 },
  lpUnlock: { k: 'LP', v: 'UNLOCKED', cls: 'bad', rug: 1 },
  lpSoon: { k: 'LP', v: 'UNLOCK<3D', cls: 'warn', rug: 1 },
  depClean: { k: 'DEPLOYER', v: 'CLEAN', cls: 'good', rug: 0 },
  depMixer: { k: 'DEPLOYER', v: 'MIXER', cls: 'bad', rug: 1 },
  depRugs: { k: 'DEPLOYER', v: '2 RUGS', cls: 'bad', rug: 1 },
  holdOk: { k: 'HOLDERS', v: 'SPREAD', cls: 'good', rug: 0 },
  holdConc: { k: 'HOLDERS', v: '68% TOP5', cls: 'bad', rug: 1 },
  noBund: { k: 'BUNDLERS', v: 'NONE', cls: 'good', rug: 0 },
  bund: { k: 'BUNDLERS', v: '19/74s', cls: 'bad', rug: 1 },
};

function generateHunt(): OutpostHunt {
  const isRug = Math.random() < 0.5;
  const reds = ['mintActive', 'freezeActive', 'lpUnlock', 'lpSoon', 'depMixer', 'depRugs', 'holdConc', 'bund'];
  const greens = ['mintRev', 'freezeRev', 'lpLock', 'depClean', 'holdOk', 'noBund'];
  const keys: string[] = [];

  if (isRug) {
    const n = Math.random() < 0.5 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const r = reds[Math.floor(Math.random() * reds.length)];
      if (!keys.includes(r)) keys.push(r);
    }
    while (keys.length < 4) {
      const g = greens[Math.floor(Math.random() * greens.length)];
      if (!keys.includes(g)) keys.push(g);
    }
  } else {
    const shuffled = [...greens].sort(() => Math.random() - 0.5);
    keys.push(...shuffled.slice(0, 4));
  }

  const sortedKeys = keys.sort(() => Math.random() - 0.5);
  const id = 'hunt_' + Math.random().toString(36).substring(2, 10);
  
  return {
    id,
    ticker: '$' + TICKERS[Math.floor(Math.random() * TICKERS.length)],
    marketCap: '$' + (Math.floor(Math.random() * 900) + 50) + 'K',
    isRug,
    signals: sortedKeys.map(k => HSIG[k]),
    spawnedAt: Date.now(),
    deadline: Date.now() + 15000, // 15 seconds deadline matching prototype feel
    winnerWallet: null,
    othersCount: Math.floor(Math.random() * 25) + 5
  };
}

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

    let hunt = await getActiveHunt();

    // If active hunt has expired, clear it
    if (hunt && Date.now() >= hunt.deadline) {
      await saveActiveHunt(null);
      hunt = null;
    }

    // 50% chance to generate a new active hunt if none exists
    if (!hunt && Math.random() < 0.6) {
      hunt = generateHunt();
      await saveActiveHunt(hunt);
    }

    return NextResponse.json({ hunt });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.expires < Date.now()) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }
    const wallet = session.wallet;

    const body = await req.json().catch(() => ({}));
    const { saidSafe } = body;

    if (saidSafe === undefined) {
      return NextResponse.json({ error: 'Missing saidSafe decision' }, { status: 400 });
    }

    const hunt = await getActiveHunt();
    if (!hunt || Date.now() >= hunt.deadline) {
      return NextResponse.json({ error: 'No active threat hunt or hunt has expired' }, { status: 400 });
    }

    const player = await getPlayer(wallet);
    const correct = (saidSafe && !hunt.isRug) || (!saidSafe && hunt.isRug);
    const speed = Math.max(0, hunt.deadline - Date.now());

    // Record player's call
    const call: OutpostHuntCall = {
      huntId: hunt.id,
      wallet,
      choice: saidSafe,
      calledAt: Date.now(),
      correct
    };
    await addHuntCall(call);

    if (correct) {
      // Check if someone already won
      if (hunt.winnerWallet) {
        return NextResponse.json({ 
          success: false, 
          message: `Correct call, but player ${hunt.winnerWallet} was faster! No rewards granted.` 
        });
      }

      // Claim victory
      hunt.winnerWallet = wallet;
      await saveActiveHunt(hunt);

      const rewardIntel = 100 + Math.ceil(speed / 1000) * 7;
      const rewardRep = 20;

      player.intel += rewardIntel;
      player.rep += rewardRep;
      await savePlayer(player);

      return NextResponse.json({
        success: true,
        correct: true,
        winner: true,
        rewardIntel,
        rewardRep,
        player
      });
    } else {
      // Incorrect call penalty
      player.rep = Math.max(0, player.rep - 15);
      await savePlayer(player);

      return NextResponse.json({
        success: true,
        correct: false,
        winner: false,
        penalty: 15,
        player
      });
    }
  } catch (error: any) {
    console.error('[outpost-threat] Hunt call resolution crashed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
