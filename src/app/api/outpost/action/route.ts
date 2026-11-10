import { NextRequest, NextResponse } from 'next/server';
import { getPlayer, savePlayer, getPlots, savePlots, getGuild, saveGuild } from '@/lib/outpost/db';
import { deployScanner, harvestScanner, unlockPlot, SCANNER_TIERS } from '@/lib/outpost/engine';
import { checkRateLimit } from '@/lib/outpost/anti_cheat';

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

export async function POST(req: NextRequest) {
  try {
    // 1. Session Authentication
    const session = await getSession(req);
    if (!session || session.expires < Date.now()) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }
    const wallet = session.wallet;

    // 2. Anti-cheat rate limiting
    if (!checkRateLimit(wallet, 150)) {
      return NextResponse.json({ error: 'Action rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, plotIndex, upgradeId } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
    }

    // Fetch player & plots from database
    const player = await getPlayer(wallet);
    const plots = await getPlots(wallet);

    // Resolve guild multiplier if any
    let guildBonus = 1.0;
    if (player.guildId) {
      const guild = await getGuild(player.guildId);
      if (guild) guildBonus = guild.bonusMultiplier;
    }

    if (action === 'deploy') {
      if (plotIndex === undefined) return NextResponse.json({ error: 'Missing plotIndex' }, { status: 400 });
      const res = deployScanner(plots, plotIndex, player, guildBonus);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

      player.cred -= res.cost!;
      const index = plots.findIndex(p => p.plotIndex === plotIndex);
      plots[index] = res.updatedPlot!;

      await savePlayer(player);
      await savePlots(wallet, plots);

      return NextResponse.json({ success: true, player, plots });
    }

    if (action === 'harvest') {
      if (plotIndex === undefined) return NextResponse.json({ error: 'Missing plotIndex' }, { status: 400 });
      const res = harvestScanner(plots, plotIndex);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

      player.intel += res.intelReward!;
      player.rep += res.repReward!;
      const index = plots.findIndex(p => p.plotIndex === plotIndex);
      plots[index] = res.updatedPlot!;

      await savePlayer(player);
      await savePlots(wallet, plots);

      return NextResponse.json({ success: true, player, plots, harvested: res.intelReward, repGained: res.repReward });
    }

    if (action === 'unlock') {
      if (plotIndex === undefined) return NextResponse.json({ error: 'Missing plotIndex' }, { status: 400 });
      const res = unlockPlot(plots, plotIndex, player);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });

      player.cred -= res.cost!;
      const index = plots.findIndex(p => p.plotIndex === plotIndex);
      plots[index] = res.updatedPlot!;

      await savePlayer(player);
      await savePlots(wallet, plots);

      return NextResponse.json({ success: true, player, plots });
    }

    if (action === 'convert') {
      const amount = body.amount !== undefined ? Math.floor(Number(body.amount)) : player.intel;
      if (amount <= 0 || amount > player.intel) {
        return NextResponse.json({ error: 'Invalid Intel amount' }, { status: 400 });
      }
      const convertedCred = amount;
      player.cred += convertedCred;
      player.intel -= amount;

      await savePlayer(player);
      return NextResponse.json({ success: true, player, converted: convertedCred, initialIntel: amount });
    }

    if (action === 'convert_cred_to_rep') {
      const amount = Math.floor(Number(body.amount));
      if (isNaN(amount) || amount <= 0 || amount > player.cred) {
        return NextResponse.json({ error: 'Invalid CRED amount' }, { status: 400 });
      }
      if (amount % 5 !== 0) {
        return NextResponse.json({ error: 'CRED amount must be a multiple of 5' }, { status: 400 });
      }
      const repGained = Math.floor(amount / 5);
      player.rep += repGained;
      player.cred -= amount;

      await savePlayer(player);
      return NextResponse.json({ success: true, player, repGained, convertedCred: amount });
    }

    if (action === 'upgrade') {
      if (!upgradeId) return NextResponse.json({ error: 'Missing upgradeId' }, { status: 400 });

      if (upgradeId === 'pro') {
        if (player.cred < 1000) return NextResponse.json({ error: 'Insufficient CRED (need 1000)' }, { status: 400 });
        if (player.scannerLevel >= 2) return NextResponse.json({ error: 'PRO scanners already unlocked' }, { status: 400 });
        player.cred -= 1000;
        player.scannerLevel = 2;
      } else if (upgradeId === 'elite') {
        if (player.cred < 2000) return NextResponse.json({ error: 'Insufficient CRED (need 2000)' }, { status: 400 });
        if (player.scannerLevel >= 3) return NextResponse.json({ error: 'ELITE scanners already unlocked' }, { status: 400 });
        if (player.scannerLevel < 2) return NextResponse.json({ error: 'Unlock PRO scanners first' }, { status: 400 });
        player.cred -= 2000;
        player.scannerLevel = 3;
      } else if (upgradeId === 'mult_5') {
        const count = player.boost5Count || 0;
        const cost = 400 + count * 100;
        if (player.cred < cost) return NextResponse.json({ error: `Insufficient CRED (need ${cost})` }, { status: 400 });
        player.cred -= cost;
        player.boost5Count = count + 1;
        player.harvestMultiplier += 0.05;
      } else if (upgradeId === 'mult_15') {
        const count = player.boost15Count || 0;
        const cost = 1200 + count * 300;
        if (player.cred < cost) return NextResponse.json({ error: `Insufficient CRED (need ${cost})` }, { status: 400 });
        player.cred -= cost;
        player.boost15Count = count + 1;
        player.harvestMultiplier += 0.15;
      } else if (upgradeId === 'mult_25') {
        const count = player.boost25Count || 0;
        const cost = 2000 + count * 500;
        if (player.cred < cost) return NextResponse.json({ error: `Insufficient CRED (need ${cost})` }, { status: 400 });
        player.cred -= cost;
        player.boost25Count = count + 1;
        player.harvestMultiplier += 0.25;
      } else {
        return NextResponse.json({ error: 'Invalid upgradeId' }, { status: 400 });
      }

      await savePlayer(player);
      return NextResponse.json({ success: true, player });
    }

    if (action === 'guild_join') {
      const { guildId: targetGuildId } = body;
      if (!targetGuildId) return NextResponse.json({ error: 'Missing guildId' }, { status: 400 });
      
      const guild = await getGuild(targetGuildId);
      if (!guild) return NextResponse.json({ error: 'Guild not found' }, { status: 400 });

      // Join guild
      player.guildId = targetGuildId;
      if (!guild.members.includes(wallet)) {
        guild.members.push(wallet);
        await saveGuild(guild);
      }
      
      await savePlayer(player);
      return NextResponse.json({ success: true, player, guild });
    }

    if (action === 'guild_contribute') {
      if (!player.guildId) return NextResponse.json({ error: 'Not in a guild' }, { status: 400 });
      if (player.intel < 100) return NextResponse.json({ error: 'Need 100 INTEL to contribute' }, { status: 400 });

      const guild = await getGuild(player.guildId);
      if (!guild) return NextResponse.json({ error: 'Guild not found' }, { status: 400 });

      player.intel -= 100;
      guild.pooledIntel += 100;

      // Every 1,000 pooled intel adds 1% to bonus, starting from 1.15 base
      guild.bonusMultiplier = 1.15 + Math.floor(guild.pooledIntel / 1000) * 0.01;

      await savePlayer(player);
      await saveGuild(guild);

      return NextResponse.json({ success: true, player, guild });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('[outpost-action] Intent handling crashed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.expires < Date.now()) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }
    const wallet = session.wallet;

    const player = await getPlayer(wallet);
    const plots = await getPlots(wallet);

    return NextResponse.json({ player, plots });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
