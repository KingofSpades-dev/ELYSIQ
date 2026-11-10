import { NextRequest, NextResponse } from 'next/server';

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url, token });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mint = searchParams.get('mint');

    if (!mint) {
      return NextResponse.json({ error: 'Mint/contract address parameter is required' }, { status: 400 });
    }

    const redis = await getRedis();
    if (!redis) {
      return NextResponse.json({ exists: false, error: 'Database connection failed' });
    }

    const projects = await redis.get<any[]>('elysiq:stache:projects') || [];
    
    // Check if the mint address matches any project's contractAddress
    const project = projects.find((p) => p && p.contractAddress && (
      p.contractAddress.toLowerCase() === mint.toLowerCase()
    ));

    if (project) {
      return NextResponse.json({ exists: true, project });
    }

    return NextResponse.json({ exists: false });
  } catch (error: any) {
    console.error('Error checking project registry:', error);
    return NextResponse.json({ exists: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
