import { NextRequest, NextResponse } from 'next/server';

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url, token });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  try {
    const { mint } = await params;
    if (!mint) {
      return NextResponse.json({ error: 'Mint address is required' }, { status: 400 });
    }

    const redis = await getRedis();
    if (!redis) {
      return NextResponse.json({ error: 'Redis configuration missing' }, { status: 500 });
    }

    const base64Data = await redis.get<string>(`elysiq:stache:mascot:${mint}`);
    if (!base64Data) {
      // Fallback to default mascot image
      const origin = process.env.NEXT_PUBLIC_URL || req.nextUrl.origin;
      return NextResponse.redirect(new URL('/images/stache/vox.png', origin));
    }

    let contentType = 'image/png';
    let buffer: Buffer;

    if (base64Data.startsWith('data:')) {
      const match = base64Data.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        contentType = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        buffer = Buffer.from(base64Data, 'base64');
      }
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error: any) {
    console.error('Error fetching mascot image:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
