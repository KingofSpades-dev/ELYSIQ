import { NextRequest, NextResponse } from 'next/server';
import { normalizeAddress } from '@/lib/chain/elysium';
import { runEvmScan, NotATokenError } from '@/lib/scan/evmScan';
import { ScanResult } from '@/lib/stache/types';

export const dynamic = 'force-dynamic';

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url, token });
}

const PASS_SCORE = 60; // same floor as the Stache tiers (BRONZE and above)

function toAuditRisk(level: string): ScanResult['riskLevel'] {
  return (level === 'RUG_RISK' ? 'CRITICAL' : level) as ScanResult['riskLevel'];
}

/**
 * Registry audit for a project that is already registered.
 *
 * Uses the same EVM scan as the scanner (one source of truth), only touches the registry entry whose
 * address matches EXACTLY, never creates entries, and never "passes" on an error: if the analysis
 * fails the request fails and the registry is left unchanged.
 */
export async function POST(req: NextRequest) {
  let release: (() => Promise<unknown>) | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    const address = typeof body.contractAddress === 'string' ? normalizeAddress(body.contractAddress.trim()) : null;
    if (!address) {
      return NextResponse.json({ error: 'A valid contract address is required' }, { status: 400 });
    }

    const redis = await getRedis();
    if (!redis) {
      return NextResponse.json({ error: 'Registry database unavailable' }, { status: 503 });
    }

    // Only registered projects can be audited here (each registration was paid for on-chain).
    const projects = (await redis.get<any[]>('elysiq:stache:projects')) || [];
    const idx = projects.findIndex((p) => p?.contractAddress && p.contractAddress.toLowerCase() === address.toLowerCase());
    if (idx === -1) {
      return NextResponse.json({ error: 'This token is not in the registry' }, { status: 404 });
    }

    // Each audit is an AI call: at most one per project per minute.
    const cooldownKey = `elysiq:stache:scan:cooldown:${address.toLowerCase()}`;
    const gate = await redis.set(cooldownKey, '1', { nx: true, ex: 60 });
    if (gate === null) {
      return NextResponse.json({ error: 'This project was just audited. Try again in a minute.' }, { status: 429 });
    }
    release = () => redis.del(cooldownKey); // a failed audit must not lock the project out

    let scan;
    try {
      scan = await runEvmScan(address);
    } catch (err: any) {
      if (err instanceof NotATokenError) {
        if (release) await release().catch(() => {});
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      throw err;
    }

    const score = scan.result.trust_score as number;
    const passed = score >= PASS_SCORE;
    const facts = scan.facts;
    const scanResult: ScanResult = {
      trustScore: score,
      riskLevel: toAuditRisk(scan.result.risk_level),
      contractChecked: true,
      deployerVerified: facts.verified_source.verified,
      bundlersFlagged: 0, // wallet-cluster risk is reported by the main scanner, not guessed here
      findings: scan.result.findings,
      passed,
    };

    projects[idx] = {
      ...projects[idx],
      status: passed ? 'Certified' : 'Revoked',
      trustScore: score,
      date: new Date().toISOString().split('T')[0],
    };
    await redis.set('elysiq:stache:projects', projects);

    return NextResponse.json(scanResult);
  } catch (error: any) {
    console.error('Audit scan error:', error);
    if (release) await release().catch(() => {});
    return NextResponse.json({ error: 'Audit scan failed' }, { status: 500 });
  }
}
