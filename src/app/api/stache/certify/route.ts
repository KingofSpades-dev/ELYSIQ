import { NextRequest, NextResponse } from 'next/server';
import { isFreshMessage, messageNamesWallet, verifyWalletSignature } from '@/lib/chain/auth';
import { normalizeAddress } from '@/lib/chain/elysium';
import { mintOrUpdatePass, stachePassAddress, TIER_TO_NUM, type TierName } from '@/lib/chain/stachePass';

export const dynamic = 'force-dynamic';

const MAX_SCAN_AGE_MS = 7 * 24 * 60 * 60 * 1000;

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url, token });
}

/**
 * Claim the Stache Pass NFT for a certified project.
 *
 * Nothing the client sends decides the tier or score: they come from the server's own latest scan.
 * Only the wallet that paid the registry fee (recorded as `registrant` by /api/stache/apply) can claim,
 * and it must prove control by signing a fresh message naming the token and the wallet.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const mint = typeof body.mint === 'string' ? normalizeAddress(body.mint) : null;
  const address = typeof body.address === 'string' ? normalizeAddress(body.address) : null;
  const { message, signature } = body;
  if (!mint || !address || typeof message !== 'string' || typeof signature !== 'string') {
    return NextResponse.json({ error: 'mint, address, message and signature are required' }, { status: 400 });
  }

  // 1. Proof of wallet control
  if (!isFreshMessage(message) || !messageNamesWallet(message, address) || !message.toLowerCase().includes(mint.toLowerCase())) {
    return NextResponse.json({ error: 'Stale or malformed claim message' }, { status: 401 });
  }
  if (!(await verifyWalletSignature(address, message, signature))) {
    return NextResponse.json({ error: 'Invalid wallet signature' }, { status: 401 });
  }

  if (!stachePassAddress() || !process.env.STACHE_MINTER_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Stache Pass minting is not configured yet' }, { status: 503 });
  }
  const redis = await getRedis();
  if (!redis) return NextResponse.json({ error: 'Registry database unavailable' }, { status: 503 });

  // 2. One claim at a time per token
  const lockKey = `elysiq:stache:certify:lock:${mint.toLowerCase()}`;
  const locked = await redis.set(lockKey, '1', { nx: true, ex: 120 });
  if (locked === null) return NextResponse.json({ error: 'A claim for this token is already in progress' }, { status: 409 });

  try {
    // 3. Only the registrant (the wallet that paid the registry fee) may claim
    const projects = (await redis.get<any[]>('elysiq:stache:projects')) || [];
    const idx = projects.findIndex((p) => p?.contractAddress && p.contractAddress.toLowerCase() === mint.toLowerCase());
    const project = idx > -1 ? projects[idx] : null;
    if (!project) return NextResponse.json({ error: 'This token is not in the registry. Register it first.' }, { status: 404 });
    if (!project.registrant || project.registrant.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Only the wallet that registered this project can claim its Stache Pass' }, { status: 403 });
    }

    // 4. Tier and score come from the server's own latest scan
    const history = (await redis.get<any[]>('elysiq:scan:history')) || [];
    const scan = history.find((h) => h?.mint && h.mint.toLowerCase() === mint.toLowerCase() && h.stache?.certified && h.powered_by !== 'ELYSIQ · Registry Sync');
    if (!scan) return NextResponse.json({ error: 'No certified scan found for this token. Run a scan first.' }, { status: 409 });
    if (Date.now() - new Date(scan.scanned_at).getTime() > MAX_SCAN_AGE_MS) {
      return NextResponse.json({ error: 'The latest scan is older than 7 days. Scan again.' }, { status: 409 });
    }
    const tier = String(scan.stache.tier) as TierName;
    if (!(tier in TIER_TO_NUM)) return NextResponse.json({ error: 'Scan is not eligible for a Stache Pass' }, { status: 409 });

    // 5. Mint (or raise the tier of the existing pass)
    const result = await mintOrUpdatePass(address, mint, tier, Number(scan.trust_score) || 0);

    projects[idx] = {
      ...project,
      status: 'Certified',
      tier,
      trustScore: Number(scan.trust_score) || 0,
      date: new Date().toISOString().split('T')[0],
      passTokenId: result.tokenId.toString(),
      passTx: result.txHash,
    };
    await redis.set('elysiq:stache:projects', projects);

    return NextResponse.json({ success: true, tokenId: result.tokenId.toString(), txHash: result.txHash, tier, updated: result.updated });
  } catch (error: any) {
    console.error('[stache-certify] failed:', error);
    return NextResponse.json({ error: 'Minting failed. Try again shortly.' }, { status: 500 });
  } finally {
    await redis.del(lockKey).catch(() => {});
  }
}
