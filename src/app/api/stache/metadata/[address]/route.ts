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
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: mint } = await params;
    if (!mint) {
      return NextResponse.json({ error: 'Token address is required' }, { status: 400 });
    }

    const redis = await getRedis();
    if (!redis) {
      return NextResponse.json({ error: 'Registry database unavailable' }, { status: 503 });
    }

    const projects = await redis.get<any[]>('elysiq:stache:projects') || [];
    const project = projects.find((p) => p && p.contractAddress && p.contractAddress.toLowerCase() === mint.toLowerCase());

    if (!project) {
      return NextResponse.json({ error: 'Project not found in registry' }, { status: 404 });
    }

    // Prepend origin if mascotUrl is a relative path
    const origin = process.env.NEXT_PUBLIC_URL || req.nextUrl.origin;
    let imageUrl = project.mascotUrl || '/images/stache/vox.png';
    if (imageUrl.startsWith('/')) {
      imageUrl = `${origin}${imageUrl}`;
    }

    // Standard NFT metadata JSON (OpenSea-compatible)
    const metadata = {
      name: `Stache Pass — ${project.project}`,
      symbol: 'STACHE',
      description: `ELYSIQ certified Stache Pass for ${project.project} (${project.tier} Tier, Trust Score: ${project.trustScore}/100).`,
      image: imageUrl,
      external_url: `${origin}/stache`,
      attributes: [
        { trait_type: 'Tier', value: project.tier },
        { trait_type: 'Trust Score', value: Number(project.trustScore) },
        { trait_type: 'Certified Token', value: project.contractAddress },
        { trait_type: 'Certified By', value: 'ELYSIQ' },
      ],
      properties: {
        files: [
          {
            uri: imageUrl,
            type: 'image/png',
          },
        ],
        category: 'image',
      },
    };

    return NextResponse.json(metadata, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error: any) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
