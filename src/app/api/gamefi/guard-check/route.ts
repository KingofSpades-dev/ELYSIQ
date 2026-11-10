import { NextRequest, NextResponse } from 'next/server';
import { computeGuardCheckState } from '@/lib/gamefi/guardian';
import { GuardCheckResponse } from '@/lib/gamefi/types';

export async function POST(req: NextRequest) {
  // CORS setup
  const origin = req.headers.get('origin') || '*';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await req.json().catch(() => ({}));
    const { target, kind } = body;

    if (!target || !kind || !['wallet', 'token'].includes(kind)) {
      return NextResponse.json(
        { error: 'target and kind ("wallet" | "token") are required parameters in the body' },
        { status: 400, headers }
      );
    }

    const demoMode = process.env.GAMEFI_DEMO_MODE === 'true' || !process.env.UPSTASH_REDIS_REST_URL;

    if (demoMode) {
      const isMockRug = target.endsWith('RUG') || target.endsWith('BAD');
      const isMockCaution = target.endsWith('WARN');

      if (isMockRug) {
        const findings = ['Counterparty reported in phishing databases', 'Suspicious flash loan activity', 'Multiple wash trade loops'];
        const score = 15;
        const guardian = computeGuardCheckState(kind, score, findings);
        
        const responseData: GuardCheckResponse = {
          target,
          kind,
          level: 'danger',
          findings,
          guardian,
        };
        return NextResponse.json(responseData, { status: 200, headers });
      }

      if (isMockCaution) {
        const findings = ['Newly created wallet (under 48h old)', 'High volume transfer to centralized exchange'];
        const score = 55;
        const guardian = computeGuardCheckState(kind, score, findings);

        const responseData: GuardCheckResponse = {
          target,
          kind,
          level: 'caution',
          findings,
          guardian,
        };
        return NextResponse.json(responseData, { status: 200, headers });
      }

      // Default safe
      const findings = ['Clean on-chain signature history', 'Consistent trading volumes'];
      const score = 90;
      const guardian = computeGuardCheckState(kind, score, findings);

      const responseData: GuardCheckResponse = {
        target,
        kind,
        level: 'safe',
        findings,
        guardian,
      };
      return NextResponse.json(responseData, { status: 200, headers });
    }

    // Non-demo mode: Check Redis scan records or do basic safety heuristics
    const { Redis } = await import('@upstash/redis');
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    const redis = url && token ? new Redis({ url, token }) : null;

    let score = 90;
    let findings: string[] = ['No known risk profiles found'];
    let level: 'safe' | 'caution' | 'danger' = 'safe';

    if (redis) {
      // Check blacklisted wallet list or past audits
      const blacklist = await redis.sismember('elysiq:blacklist:wallets', target);
      if (blacklist) {
        score = 10;
        findings = ['Wallet verified in the Elysiq malicious threat database.'];
        level = 'danger';
      }
    }

    const guardian = computeGuardCheckState(kind, score, findings);
    const responseData: GuardCheckResponse = {
      target,
      kind,
      level,
      findings,
      guardian,
    };

    return NextResponse.json(responseData, { status: 200, headers });
  } catch (error: any) {
    console.error('Error in GameFi guard-check API:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500, headers }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
