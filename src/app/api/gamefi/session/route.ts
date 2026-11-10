import { NextRequest, NextResponse } from 'next/server';
import { getGameCertification, getPlayerStachePassTier } from '@/lib/gamefi/stachepass';
import { getPerksForTier } from '@/lib/gamefi/perks';
import { computeGuardianState } from '@/lib/gamefi/guardian';
import { UnifiedSessionResponse } from '@/lib/gamefi/types';

export async function GET(req: NextRequest) {
  // CORS setup
  const origin = req.headers.get('origin') || '*';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');
  const gameMint = searchParams.get('gameMint');

  if (!wallet || !gameMint) {
    return NextResponse.json(
      { error: 'wallet and gameMint parameters are required' },
      { status: 400, headers }
    );
  }

  try {
    // 1. Fetch game certification (Scan-to-Play)
    const game = await getGameCertification(gameMint);

    // 2. Fetch player credentials (Stache Pass check)
    const tier = await getPlayerStachePassTier(wallet);
    const perks = getPerksForTier(tier);

    // 3. Compute in-game companion state (posture/expression)
    const guardian = computeGuardianState(game.certified, game.trustScore, tier);

    const responseData: UnifiedSessionResponse = {
      game,
      player: {
        walletAddress: wallet,
        stachePassTier: tier,
        perks,
      },
      guardian,
    };

    return NextResponse.json(responseData, { status: 200, headers });
  } catch (error: any) {
    console.error('Error generating gamefi session:', error);
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
