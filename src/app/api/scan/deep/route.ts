import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/soul/session';
import { hasValidScanReceipt } from '@/lib/token/receipt';
import { normalizeAddress } from '@/lib/chain/elysium';
import { runEvmScan, NotATokenError } from '@/lib/scan/evmScan';

// ── Redis Connection ──────────────────────────────

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url, token });
}

// ── Mock Data ──────────────────────────────────────

const MOCKS: Record<string, any> = {
  '0x00000000000000000000000000000000000e1151': {
    name: 'ELYSIQ',
    symbol: 'ELYSIQ',
    reasoning: 'The contract has fully revoked mint and freeze authorities. The LP is locked for 24 months, preventing developer draining. Holder distribution is highly organic with no suspicious bundler clusters. The deployer wallet also has a clean history. Therefore, the risk is extremely low and the contract is safe to interact with.',
    trust_score: 95,
    risk_level: 'SAFE',
    verdict: 'Excellent contract security and organic holder spread. Safe to interact.',
    mint_authority: 'revoked',
    freeze_authority: 'revoked',
    lp_locked: true,
    top_holder_concentration: 'Top 5 hold 15%',
    bundler_risk: 'LOW',
    findings: ['No mint or freeze authority', 'LP locked for 24 months'],
    green_flags: ['Organic holder distribution', 'Established liquidity $850K', 'Deployer has clean history'],
    market_cap: 1200000,
  },
  '0x000000000000000000000000000000000000a2d4': {
    name: 'WizardCoin',
    symbol: 'WZRD',
    reasoning: 'The mint and freeze authorities are revoked, which is positive. However, the LP is completely unlocked, exposing traders to potential rug pulls. Furthermore, the top 5 wallets hold 41% of the total supply, indicating high holder concentration. Some coordinated entries are also detected, which increases risk. Caution is advised.',
    trust_score: 54,
    risk_level: 'MEDIUM',
    verdict: 'Mixed signals. Authorities revoked but holder concentration is high. Proceed with caution.',
    mint_authority: 'revoked',
    freeze_authority: 'revoked',
    lp_locked: false,
    top_holder_concentration: 'Top 5 hold 41%',
    bundler_risk: 'MEDIUM',
    findings: ['LP not locked', 'Top 5 wallets hold 41%', 'Some coordinated entry detected'],
    green_flags: ['Mint authority revoked', 'Freeze authority revoked'],
    market_cap: 180000,
  },
  '0x000000000000000000000000000000000000b00b': {
    name: 'MoonRocket',
    symbol: 'MOON',
    reasoning: 'Active mint and freeze authorities pose extreme security risks as the creator can mint new tokens or freeze user accounts at any time. The LP is completely unlocked. There is also an extreme holder concentration (top 5 hold 67%) and an active bundler cluster was detected, indicating a high risk of an imminent rug pull. Do not buy.',
    trust_score: 14,
    risk_level: 'RUG_RISK',
    verdict: 'Active mint authority and unlocked liquidity. Do not buy. High rug risk.',
    mint_authority: 'active',
    freeze_authority: 'active',
    lp_locked: false,
    top_holder_concentration: 'Top 5 hold 67%',
    bundler_risk: 'HIGH',
    findings: ['Mint authority still active', 'Freeze authority still active', 'LP not locked', 'Top 5 hold 67% — extreme concentration', 'Bundler cluster detected'],
    green_flags: [],
    market_cap: 45000,
  }
};

// ── Tier resolver ──────────────────────────────────

function resolveTier(score: number, marketCap: number) {
  if (score < 60) return { tier: 'NONE', color: null };
  if (marketCap >= 5_000_000 && score >= 80) return { tier: 'LEGENDARY', color: '#D4633A' };
  if (marketCap >= 500_000 && score >= 70) return { tier: 'GOLD', color: '#C9A84C' };
  return { tier: 'BRONZE', color: '#8B6914' };
}

// ── Main handler ───────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // 1. Resolve auth session
    const redis = await getRedis();
    const sessionId = req.cookies.get('elysiq_session_id')?.value;
    const session = sessionId ? await getSession(sessionId) : null;
    if (!session || session.expires < Date.now()) {
      return NextResponse.json({ error: 'Connect wallet' }, { status: 401 });
    }

    const address = typeof body.mint === 'string' ? normalizeAddress(body.mint) : null;
    if (!address) {
      return NextResponse.json({ error: 'Invalid contract address' }, { status: 400 });
    }
    const mint: string = address;

    // 2. Gate: Tier >= 2 (hold) or a verified pay-with-$ELYSIQ receipt
    if (session.tier < 2) {
      const paid = await hasValidScanReceipt(session.wallet, body.payment_tx, redis);
      if (!paid) {
        return NextResponse.json({
          error: 'Deep scan requires Tier 2 or a pay-with-$ELYSIQ receipt',
          options: ['hold', 'pay'],
        }, { status: 403 });
      }
    }

    // Check 5-minute cache
    if (redis) {
      const cached = await redis.get<any>(`elysiq:scan:cache:${mint}`);
      if (cached) {
        return NextResponse.json({
          ...cached,
          cached: true
        });
      }
    }

    let result: any;
    let name = '';
    let symbol = '';
    let marketCap = 0;

    // Check if the input is a mock address
    if (MOCKS[mint.toLowerCase()]) {
      const mockResult = MOCKS[mint.toLowerCase()];
      result = {
        reasoning: mockResult.reasoning,
        trust_score: mockResult.trust_score,
        risk_level: mockResult.risk_level,
        verdict: mockResult.verdict,
        mint_authority: mockResult.mint_authority,
        freeze_authority: mockResult.freeze_authority,
        lp_locked: mockResult.lp_locked,
        top_holder_concentration: mockResult.top_holder_concentration,
        bundler_risk: mockResult.bundler_risk,
        findings: mockResult.findings,
        green_flags: mockResult.green_flags,
        market_cap: mockResult.market_cap,
      };
      name = mockResult.name;
      symbol = mockResult.symbol;
      marketCap = mockResult.market_cap;
    } else {
      let scan;
      try {
        scan = await runEvmScan(address);
      } catch (err: any) {
        if (err instanceof NotATokenError) {
          return NextResponse.json({ error: err.message }, { status: 404 });
        }
        throw err;
      }
      result = scan.result;
      name = scan.name;
      symbol = scan.symbol;
      marketCap = scan.marketCap;
    }

    // Resolve Stache tier safely
    const score = typeof result?.trust_score === 'number' ? result.trust_score : 0;
    const { tier, color } = resolveTier(score, marketCap);

    const responseData = {
      mint,
      name,
      symbol,
      ...result,
      market_cap: marketCap,
      stache: {
        certified: tier !== 'NONE',
        tier,
        color,
        eligible_for_mint: tier !== 'NONE',
      },
      scanned_at: new Date().toISOString(),
      powered_by: 'ELYSIQ · Claude',
    };

    // Store in 5-minute cache & save to scan history in Upstash Redis
    if (redis) {
      await redis.set(`elysiq:scan:cache:${mint}`, responseData, { ex: 300 });

      try {
        let history = await redis.get<any[]>('elysiq:scan:history') || [];
        if (!Array.isArray(history)) {
          history = [];
        }
        history.unshift(responseData);
        if (history.length > 100) {
          history = history.slice(0, 100);
        }
        await redis.set('elysiq:scan:history', history);
      } catch (redisErr) {
        console.error('Failed to save to scan history:', redisErr);
      }
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error running token scan:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
