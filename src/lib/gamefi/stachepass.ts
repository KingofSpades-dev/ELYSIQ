import { getClient, normalizeAddress } from '@/lib/chain/elysium';
import { NUM_TO_TIER, stachePassAbi, stachePassAddress } from '@/lib/chain/stachePass';
import { GameCertification } from './types';

// Upstash Redis setup
async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url, token });
}

// Check game certification in Redis (Scan-to-Play)
export async function getGameCertification(gameMint: string): Promise<GameCertification> {
  const demoMode = process.env.GAMEFI_DEMO_MODE === 'true' || !process.env.UPSTASH_REDIS_REST_URL;

  if (demoMode) {
    // Return mock data for known test game mints or default mock
    const isMockLeg = gameMint.startsWith('LEG');
    const isMockGold = gameMint.startsWith('GLD');
    const isMockFail = gameMint.startsWith('BAD') || gameMint.startsWith('RUG');

    if (isMockFail) {
      return {
        mintAddress: gameMint,
        gameName: 'Rugland Arena (Demo)',
        certified: false,
        tier: 'NONE',
        trustScore: 32,
        scanVerdict: 'Deployer wallet recycling patterns detected. Suspicious liquidity withdrawal paths observed in 24h history.',
        findings: ['Developer wallet recycling', 'Locked liquidity duration under 30 days', 'Suspicious creator trade activity'],
      };
    }

    return {
      mintAddress: gameMint,
      gameName: 'SolMascots Conquest (Demo)',
      certified: true,
      tier: isMockLeg ? 'LEGENDARY' : (isMockGold ? 'GOLD' : 'BRONZE'),
      trustScore: isMockLeg ? 95 : (isMockGold ? 85 : 72),
      scanVerdict: 'Clean deployer wallet history. Creator locked liquidity. No high-risk permissions in token contract.',
      findings: ['Liquidity locked 1 year', 'No proxy/mint authority'],
    };
  }

  try {
    const redis = await getRedis();
    if (!redis) throw new Error('Redis client missing');

    const projects = await redis.get<any[]>('elysiq:stache:projects') || [];
    const matched = projects.find((p) => p && p.contractAddress === gameMint);

    if (matched) {
      return {
        mintAddress: gameMint,
        gameName: matched.project,
        certified: matched.status === 'Certified',
        tier: matched.tier || 'BRONZE',
        trustScore: Number(matched.trustScore) || 0,
        scanVerdict: `Token validated on-chain. Registered as ${matched.tier || 'BRONZE'} tier.`,
        findings: matched.findings || ['Registered in Elysiq Registry'],
      };
    }
  } catch (err) {
    console.error('Failed to query game certification from Redis:', err);
  }

  // Skenario fallback jika tidak ditemukan di DB
  return {
    mintAddress: gameMint,
    gameName: 'Unregistered Game',
    certified: false,
    tier: 'NONE',
    trustScore: 0,
    scanVerdict: 'This contract has not been submitted to the Stache Protocol registry.',
    findings: ['Not found in registry'],
  };
}

// Check the player's Stache Pass NFT on Elysium (ElysiqStachePass.tierOfHolder: best tier among held passes)
export async function getPlayerStachePassTier(walletAddress: string): Promise<'NONE' | 'BRONZE' | 'GOLD' | 'LEGENDARY'> {
  if (process.env.GAMEFI_DEMO_MODE === 'true') {
    // Simulated tier based on wallet address endings (local testing only)
    const w = walletAddress.toLowerCase();
    if (w.endsWith('1e9')) return 'LEGENDARY';
    if (w.endsWith('601d')) return 'GOLD';
    if (w.endsWith('b20')) return 'BRONZE';
    return 'NONE';
  }

  const pass = stachePassAddress();
  const owner = normalizeAddress(walletAddress);
  if (!pass || !owner) return 'NONE';

  try {
    const tier = await getClient().readContract({ address: pass, abi: stachePassAbi, functionName: 'tierOfHolder', args: [owner] });
    return NUM_TO_TIER[Number(tier)] ?? 'NONE';
  } catch (err) {
    console.error('Error reading Stache Pass tier:', err);
    return 'NONE';
  }
}
