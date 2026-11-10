import { NextRequest, NextResponse } from 'next/server';
import { HybridSoulProvider } from '@/lib/soul/provider';
import { tierFor } from '@/lib/token/access';
import { getSession } from '@/lib/soul/session';
import { validateCosmeticsForTier } from '@/lib/companion/cosmetics';

const soul = new HybridSoulProvider();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 });
    }

    let memory = await soul.load(wallet);
    if (!memory) {
      memory = soul.createDefaultMemory(wallet);
      await soul.save(wallet, memory);
    }

    // Ensure appearance always exists
    if (!memory.appearance) {
      memory.appearance = {
        bodyVariant: 'terracotta',
        accessories: [],
        background: 'default',
        defaultMood: 'NEUTRAL',
        personalityFlavor: 'standard'
      };
      await soul.save(wallet, memory);
    }

    const tier = await tierFor(wallet);

    return NextResponse.json({ appearance: memory.appearance, tier });
  } catch (error: any) {
    console.error('[API] GET appearance error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet, appearance } = body;

    if (!wallet || !appearance) {
      return NextResponse.json({ error: 'Missing wallet or appearance field' }, { status: 400 });
    }

    // Only the signed-in owner of the wallet may change its companion.
    const sessionId = req.cookies.get('elysiq_session_id')?.value;
    const session = sessionId ? await getSession(sessionId) : null;
    if (!session || session.expires < Date.now()) {
      return NextResponse.json({ error: 'Sign in with your wallet first' }, { status: 401 });
    }
    if (typeof wallet !== 'string' || session.wallet.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json({ error: 'You can only edit your own companion' }, { status: 403 });
    }

    // Server-side tier verification
    const tier = await tierFor(session.wallet);
    const validation = validateCosmeticsForTier(appearance, tier);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason || 'Cosmetic validation failed for your tier' }, { status: 403 });
    }

    // Name length and character checks for security
    if (appearance.name) {
      const sanitizedName = appearance.name.trim().slice(0, 20).replace(/[^a-zA-Z0-9\s_-]/g, '');
      appearance.name = sanitizedName;
    }

    let memory = await soul.load(wallet);
    if (!memory) {
      memory = soul.createDefaultMemory(wallet);
    }

    memory.appearance = {
      bodyVariant: appearance.bodyVariant || 'terracotta',
      accessories: appearance.accessories || [],
      background: appearance.background || 'default',
      defaultMood: appearance.defaultMood || 'NEUTRAL',
      personalityFlavor: appearance.personalityFlavor || 'standard',
      name: appearance.name || undefined
    };

    await soul.save(wallet, memory);

    return NextResponse.json({ appearance: memory.appearance });
  } catch (error: any) {
    console.error('[API] POST appearance error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
