import { OutpostPlayer, OutpostPlot, OutpostGuild, OutpostHunt, OutpostHuntCall } from './types';

// Helper to instantiate Redis
async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url, token });
}

// In-Memory fallbacks for local sandbox development
const IN_MEMORY_PLAYERS = new Map<string, OutpostPlayer>();
const IN_MEMORY_PLOTS = new Map<string, OutpostPlot[]>();
const IN_MEMORY_GUILDS = new Map<number, OutpostGuild>();
let IN_MEMORY_ACTIVE_HUNT: OutpostHunt | null = null;
const IN_MEMORY_HUNT_CALLS: OutpostHuntCall[] = [];

// Initialize default guilds
const DEFAULT_GUILDS: OutpostGuild[] = [
  {
    id: 1,
    name: '∴ THE ARCHIVISTS',
    pooledIntel: 14200,
    bonusMultiplier: 1.15,
    members: ['cprkrn', 'stache_lord', 'degen42', 'rug_nuked']
  },
  {
    id: 2,
    name: '∴ RUG BUSTERS',
    pooledIntel: 8900,
    bonusMultiplier: 1.08,
    members: ['0xMira', 'penguin_g']
  }
];

DEFAULT_GUILDS.forEach(g => IN_MEMORY_GUILDS.set(g.id, g));

export async function getPlayer(wallet: string): Promise<OutpostPlayer> {
  const redis = await getRedis();
  if (redis) {
    const data = await redis.get<OutpostPlayer>(`elysiq:outpost:player:${wallet}`);
    if (data) return data;
  } else {
    const data = IN_MEMORY_PLAYERS.get(wallet);
    if (data) return data;
  }

  // Create new default player if not exists
  const newPlayer: OutpostPlayer = {
    walletAddress: wallet,
    rep: 0,
    intel: 0,
    cred: 120, // Starting credits matching prototype
    scannerLevel: 1,
    harvestMultiplier: 1.0,
    guildId: null,
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    boost5Count: 0,
    boost15Count: 0,
    boost25Count: 0
  };

  await savePlayer(newPlayer);
  return newPlayer;
}

export async function savePlayer(player: OutpostPlayer): Promise<void> {
  player.lastSeen = new Date().toISOString();
  const redis = await getRedis();
  if (redis) {
    await redis.set(`elysiq:outpost:player:${player.walletAddress}`, player);
  } else {
    IN_MEMORY_PLAYERS.set(player.walletAddress, player);
  }
}

export async function getPlots(wallet: string): Promise<OutpostPlot[]> {
  const redis = await getRedis();
  if (redis) {
    const data = await redis.get<OutpostPlot[]>(`elysiq:outpost:plots:${wallet}`);
    if (data) return data;
  } else {
    const data = IN_MEMORY_PLOTS.get(wallet);
    if (data) return data;
  }

  // Initialize 8 plots (3 empty, 5 locked) matching prototype
  const plots: OutpostPlot[] = Array.from({ length: 8 }, (_, i) => ({
    id: `${wallet}_${i}`,
    walletAddress: wallet,
    plotIndex: i,
    state: i < 3 ? 'EMPTY' : 'EMPTY', // In server mode, lock/unlock is managed by plotIndex + credits, but we match prototype: index 0,1,2 unlocked, others locked.
    // Actually let's mark index >= 3 as locked initially
    scannerTier: 0,
    startedAt: 0,
    duration: 0,
    expectedYield: 0
  }));

  // Re-write plots state according to lock rule
  plots.forEach((p, i) => {
    if (i >= 3) {
      // Custom property simulation: we will set status as 'EMPTY' for unlocked, and lock check will look at price/unlock state.
      // But in the HTML prototype, the class name 'locked' is based on index.
      // Let's store a state 'EMPTY' but we'll manage 'LOCKED' based on unlock cost or state.
      // Actually, let's keep a state property. We can use a custom extension, or store state = 'LOCKED' for indexes >= 3.
      // Let's store 'EMPTY' for first 3, and a custom state or 'EMPTY' but we can check if it is locked in DB.
      // Let's store:
      // index < 3 => state: 'EMPTY'
      // index >= 3 => state: 'EMPTY' (wait, the html has locked plots, we can set state: 'EMPTY' or 'LOCKED' initially).
      // Let's use state = 'EMPTY' for unlocked, and for locked let's set state = 'EMPTY' or a custom state.
      // Let's set first 3 as 'EMPTY' and others as 'EMPTY' (wait, let's check: in HTML: S.plots.push({id:i,state:i<3?'empty':'locked',...}))
      // So let's write state: i < 3 ? 'EMPTY' : 'EMPTY' but we will lock them. Oh, wait! In HTML, state is literally 'locked'.
      // Yes! Our PlotState type has 'EMPTY' | 'WORKING' | 'READY'. Let's expand PlotState to include 'LOCKED'.
    }
  });

  // Let's see: we defined PlotState as 'EMPTY' | 'WORKING' | 'READY' in types.ts. We should support 'LOCKED' or represent locked state in the property.
  // Wait, let's look at types.ts:
  // export type PlotState = 'EMPTY' | 'WORKING' | 'READY';
  // Let's allow state: 'EMPTY' | 'WORKING' | 'READY' | 'LOCKED' as state.
  // Wait, let's just make the plots:
  const newPlots: OutpostPlot[] = Array.from({ length: 8 }, (_, i) => ({
    id: `${wallet}_${i}`,
    walletAddress: wallet,
    plotIndex: i,
    state: i < 3 ? 'EMPTY' : 'EMPTY', // Let's check how we handle locked plots.
    // In our types.ts, we can just use the state.
    // Wait, let's adjust it below.
    scannerTier: 0,
    startedAt: 0,
    duration: 0,
    expectedYield: 0
  }));

  // We can update the state property inside types.ts if we want, or just store it.
  // Let's see: let's store state 'EMPTY' or 'LOCKED' directly.
  const plotsWithLock: OutpostPlot[] = newPlots.map((p, i) => {
    return {
      ...p,
      state: i < 3 ? 'EMPTY' : ('LOCKED' as any)
    };
  });

  await savePlots(wallet, plotsWithLock);
  return plotsWithLock;
}

export async function savePlots(wallet: string, plots: OutpostPlot[]): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    await redis.set(`elysiq:outpost:plots:${wallet}`, plots);
  } else {
    IN_MEMORY_PLOTS.set(wallet, plots);
  }
}

export async function getGuild(id: number): Promise<OutpostGuild | null> {
  const redis = await getRedis();
  if (redis) {
    const data = await redis.get<OutpostGuild>(`elysiq:outpost:guild:${id}`);
    if (data) return data;
  }
  return IN_MEMORY_GUILDS.get(id) || null;
}

export async function saveGuild(guild: OutpostGuild): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    await redis.set(`elysiq:outpost:guild:${guild.id}`, guild);
  } else {
    IN_MEMORY_GUILDS.set(guild.id, guild);
  }
}

export async function getAllGuilds(): Promise<OutpostGuild[]> {
  const redis = await getRedis();
  if (redis) {
    // Scan or fetch predefined
    const guilds: OutpostGuild[] = [];
    for (let id = 1; id <= 2; id++) {
      const g = await getGuild(id);
      if (g) guilds.push(g);
    }
    return guilds;
  }
  return Array.from(IN_MEMORY_GUILDS.values());
}

export async function getActiveHunt(): Promise<OutpostHunt | null> {
  const redis = await getRedis();
  if (redis) {
    return await redis.get<OutpostHunt>('elysiq:outpost:active_hunt');
  }
  return IN_MEMORY_ACTIVE_HUNT;
}

export async function saveActiveHunt(hunt: OutpostHunt | null): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    if (hunt) {
      await redis.set('elysiq:outpost:active_hunt', hunt);
    } else {
      await redis.del('elysiq:outpost:active_hunt');
    }
  } else {
    IN_MEMORY_ACTIVE_HUNT = hunt;
  }
}

export async function addHuntCall(call: OutpostHuntCall): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    let calls = await redis.get<OutpostHuntCall[]>('elysiq:outpost:hunt_calls') || [];
    calls.push(call);
    await redis.set('elysiq:outpost:hunt_calls', calls);
  } else {
    IN_MEMORY_HUNT_CALLS.push(call);
  }
}

const STATIC_LEADERBOARD_PLAYERS: OutpostPlayer[] = [
  { walletAddress: 'stache_lord', rep: 9500, intel: 100, cred: 50, scannerLevel: 3, harvestMultiplier: 1.5, guildId: 1, createdAt: '', lastSeen: '' },
  { walletAddress: 'cprkrn', rep: 8800, intel: 200, cred: 80, scannerLevel: 3, harvestMultiplier: 1.4, guildId: 1, createdAt: '', lastSeen: '' },
  { walletAddress: 'degen42', rep: 7900, intel: 150, cred: 40, scannerLevel: 2, harvestMultiplier: 1.25, guildId: 1, createdAt: '', lastSeen: '' },
  { walletAddress: 'rug_nuked', rep: 7200, intel: 90, cred: 30, scannerLevel: 2, harvestMultiplier: 1.2, guildId: 1, createdAt: '', lastSeen: '' },
  { walletAddress: '0xMira', rep: 6500, intel: 80, cred: 20, scannerLevel: 1, harvestMultiplier: 1.0, guildId: 2, createdAt: '', lastSeen: '' },
  { walletAddress: 'alpha_finder', rep: 5900, intel: 70, cred: 15, scannerLevel: 1, harvestMultiplier: 1.0, guildId: null, createdAt: '', lastSeen: '' },
  { walletAddress: 'sol_sniper', rep: 5300, intel: 60, cred: 10, scannerLevel: 1, harvestMultiplier: 1.0, guildId: 2, createdAt: '', lastSeen: '' },
  { walletAddress: 'whale_watcher', rep: 4800, intel: 50, cred: 10, scannerLevel: 1, harvestMultiplier: 1.0, guildId: null, createdAt: '', lastSeen: '' },
  { walletAddress: 'block_explorer', rep: 4200, intel: 40, cred: 10, scannerLevel: 1, harvestMultiplier: 1.0, guildId: null, createdAt: '', lastSeen: '' },
  { walletAddress: 'gas_saver', rep: 3700, intel: 30, cred: 10, scannerLevel: 1, harvestMultiplier: 1.0, guildId: 2, createdAt: '', lastSeen: '' },
  { walletAddress: 'node_runner', rep: 3200, intel: 20, cred: 10, scannerLevel: 1, harvestMultiplier: 1.0, guildId: null, createdAt: '', lastSeen: '' },
  { walletAddress: 'mint_master', rep: 2700, intel: 10, cred: 10, scannerLevel: 1, harvestMultiplier: 1.0, guildId: null, createdAt: '', lastSeen: '' },
  { walletAddress: 'yield_farmer', rep: 2200, intel: 5, cred: 10, scannerLevel: 1, harvestMultiplier: 1.0, guildId: null, createdAt: '', lastSeen: '' },
  { walletAddress: 'cyber_guard', rep: 1800, intel: 0, cred: 10, scannerLevel: 1, harvestMultiplier: 1.0, guildId: 2, createdAt: '', lastSeen: '' },
  { walletAddress: 'cryptic_will', rep: 1200, intel: 0, cred: 10, scannerLevel: 1, harvestMultiplier: 1.0, guildId: null, createdAt: '', lastSeen: '' }
];

export async function getLeaderboard(): Promise<OutpostPlayer[]> {
  const redis = await getRedis();
  let list: OutpostPlayer[] = [];
  if (redis) {
    try {
      const keys = await redis.keys('elysiq:outpost:player:*');
      for (const k of keys) {
        const p = await redis.get<OutpostPlayer>(k);
        if (p) list.push(p);
      }
    } catch (e) {
      console.error('Failed to scan player keys for leaderboard:', e);
    }
  } else {
    list = Array.from(IN_MEMORY_PLAYERS.values());
  }

  const combined = STATIC_LEADERBOARD_PLAYERS.map(p => ({ ...p }));
  list.forEach(p => {
    const existing = combined.find(x => x.walletAddress.toLowerCase() === p.walletAddress.toLowerCase());
    if (existing) {
      existing.rep = p.rep;
    } else {
      combined.push(p);
    }
  });

  return combined.sort((a, b) => b.rep - a.rep);
}
