// src/app/api/auth/siws/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { tierFor } from '@/lib/token/access';
import { getSession, saveSession, deleteSession } from '@/lib/soul/session';
import { verifyWalletSignature, isFreshMessage, messageNamesWallet } from '@/lib/chain/auth';
import { normalizeAddress } from '@/lib/chain/elysium';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { address: rawAddress, message, signature } = body;
    const address = typeof rawAddress === 'string' ? normalizeAddress(rawAddress) : null;

    if (!address || typeof message !== 'string' || typeof signature !== 'string') {
      return NextResponse.json({ error: 'Missing SIWE validation fields' }, { status: 400 });
    }
    if (!isFreshMessage(message) || !messageNamesWallet(message, address)) {
      return NextResponse.json({ error: 'Stale or malformed sign-in message' }, { status: 401 });
    }

    // 1. Verify the signature
    const isValid = await verifyWalletSignature(address, message, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid wallet cryptographic signature' }, { status: 401 });
    }

    // 2. Query the wallet's $ELYSIQ tier
    const tier = await tierFor(address);

    // 3. Save session (expires in 1 hour)
    const sessionId = 'session_' + crypto.randomUUID();
    const expires = Date.now() + 3600000;
    const sessionData = { wallet: address, tier, expires };

    await saveSession(sessionId, sessionData);

    const response = NextResponse.json({
      success: true,
      wallet: address,
      tier,
      message: `Signed in as Tier ${tier} Holder.`
    });

    // Set cookie
    response.cookies.set('elysiq_session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    });

    return response;
  } catch (error: any) {
    console.error('[siwe] Authentication error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.cookies.get('elysiq_session_id')?.value;
    if (!sessionId) {
      return NextResponse.json({ authenticated: false, wallet: null, tier: 0 });
    }

    const session = await getSession(sessionId);

    if (!session || session.expires < Date.now()) {
      if (sessionId) {
        await deleteSession(sessionId);
      }
      return NextResponse.json({ authenticated: false, wallet: null, tier: 0 });
    }

    // Refresh tier
    const currentTier = await tierFor(session.wallet);
    session.tier = currentTier;
    await saveSession(sessionId, session);

    return NextResponse.json({
      authenticated: true,
      wallet: session.wallet,
      tier: session.tier
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE to sign out
export async function DELETE(req: NextRequest) {
  const sessionId = req.cookies.get('elysiq_session_id')?.value;
  if (sessionId) {
    await deleteSession(sessionId);
  }
  const response = NextResponse.json({ success: true, message: 'Logged out' });
  response.cookies.delete('elysiq_session_id');
  return response;
}
