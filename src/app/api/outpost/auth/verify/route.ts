import { NextRequest, NextResponse } from 'next/server';
import { verifyWalletSignature, isFreshMessage, messageNamesWallet } from '@/lib/chain/auth';
import { normalizeAddress } from '@/lib/chain/elysium';
import { balanceFor } from '@/lib/token/access';

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url, token });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { address: rawAddress, message, signature, nonce } = body;
    const address = typeof rawAddress === 'string' ? normalizeAddress(rawAddress) : null;

    if (!address || typeof message !== 'string' || typeof signature !== 'string' || typeof nonce !== 'string') {
      return NextResponse.json({ error: 'Missing validation parameters' }, { status: 400 });
    }

    // 1. Verify Nonce from Redis or global Map fallback
    let nonceObj = null;
    const redis = await getRedis();
    if (redis) {
      nonceObj = await redis.get<{ nonce: string; expires: number }>(`elysiq:nonce:${nonce}`);
      if (nonceObj) {
        await redis.del(`elysiq:nonce:${nonce}`); // Single-use nonce
      }
    } else {
      const globalNonces = (globalThis as any).NONCES || new Map();
      nonceObj = globalNonces.get(nonce);
      if (nonceObj) {
        globalNonces.delete(nonce); // Single-use nonce
      }
    }

    if (!nonceObj || nonceObj.expires < Date.now()) {
      return NextResponse.json({ error: 'Expired or invalid login nonce' }, { status: 401 });
    }

    // 2. Cryptographic signature check (message must contain the nonce and name the wallet)
    if (!message.includes(nonce) || !messageNamesWallet(message, address) || !isFreshMessage(message)) {
      return NextResponse.json({ error: 'Malformed login message' }, { status: 401 });
    }
    const isValid = await verifyWalletSignature(address, message, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid cryptographic signature' }, { status: 401 });
    }

    // 3. Gating check: 1000 $ELYSIQ balance on Elysium
    const balance = await balanceFor(address);
    if (balance < 1000) {
      return NextResponse.json({ error: 'Requires at least 1,000 $ELYSIQ', balance }, { status: 403 });
    }

    // 4. Create Session (Cookie matching SIWE pattern)
    const sessionId = 'session_' + crypto.randomUUID();
    const expires = Date.now() + 3600000; // 1 hour
    const sessionData = { wallet: address, tier: balance >= 25000 ? 3 : balance >= 5000 ? 2 : 1, expires };

    if (redis) {
      await redis.set(`elysiq:session:${sessionId}`, sessionData, { ex: 3600 });
    } else {
      // Re-use session caching
      const globalSessions = (globalThis as any).SESSIONS || new Map();
      globalSessions.set(sessionId, sessionData);
      (globalThis as any).SESSIONS = globalSessions;
    }

    const response = NextResponse.json({
      success: true,
      wallet: address,
      balance,
      message: 'Access granted. Welcome to ELYSIQ Outpost.'
    });

    response.cookies.set('elysiq_session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    });

    return response;
  } catch (error: any) {
    console.error('[outpost-auth] Verification crashed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
