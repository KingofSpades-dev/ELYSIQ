import { NextRequest, NextResponse } from 'next/server';

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url, token });
}

const DEFAULT_ROWS: any[] = [];

export async function GET() {
  try {
    const redis = await getRedis();
    if (!redis) {
      return NextResponse.json(DEFAULT_ROWS);
    }

    let projects = await redis.get<any[]>('elysiq:stache:projects');

    // Auto-repair/reset DB only if it has never been initialized (is null)
    const needsReset = projects === null;

    if (needsReset) {
      await redis.set('elysiq:stache:projects', DEFAULT_ROWS);
      projects = DEFAULT_ROWS;
    }

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error('Error fetching registry:', error);
    return NextResponse.json(DEFAULT_ROWS);
  }
}

export async function POST(req: NextRequest) {
  // Certification is issued by /api/stache/certify. This legacy endpoint is admin-only
  // (it used to accept unauthenticated "Certified" entries from anyone) and fails closed.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const cert = await req.json().catch(() => ({}));
    const { name, trustScore, tier, mint, certifiedAt } = cert;

    if (!name || !mint) {
      return NextResponse.json({ error: 'Project name and contract address are required' }, { status: 400 });
    }

    const redis = await getRedis();
    if (redis) {
      let projects = await redis.get<any[]>('elysiq:stache:projects') || [];

      // Find project by contractAddress or project name
      const existingIndex = projects.findIndex((p) => p && (
        p.contractAddress === mint || 
        (p.project && p.project.toLowerCase() === name.toLowerCase())
      ));

      if (existingIndex > -1) {
        // Upsert: update existing entry
        projects[existingIndex] = {
          ...projects[existingIndex],
          project: name,
          trustScore: Number(trustScore) || projects[existingIndex].trustScore || 0,
          tier: tier || projects[existingIndex].tier || 'BRONZE',
          date: (certifiedAt || new Date().toISOString()).split('T')[0],
          contractAddress: mint,
        };
      } else {
        // Insert: prepend new entry
        projects.unshift({
          project: name,
          status: 'Certified',
          trustScore: Number(trustScore) || 0,
          tier: tier || 'BRONZE',
          date: (certifiedAt || new Date().toISOString()).split('T')[0],
          certifiedBy: 'ELYSIQ',
          contractAddress: mint,
          mascotUrl: '/images/stache/vox.png', // default placeholder mascot image for scanner submissions
        });
      }
      await redis.set('elysiq:stache:projects', projects);

      // Prepend registry entry to scan history (ditambahkan saja)
      try {
        let history = await redis.get<any[]>('elysiq:scan:history') || [];
        if (!Array.isArray(history)) {
          history = [];
        }

        const tierColor = tier === 'LEGENDARY' ? '#D4633A' : (tier === 'GOLD' ? '#C9A84C' : '#8B6914');
        const historyEntry = {
          mint,
          name,
          symbol: '',
          trust_score: Number(trustScore) || 0,
          risk_level: Number(trustScore) >= 70 ? 'SAFE' : 'MEDIUM',
          verdict: `Project officially certified as ${tier || 'BRONZE'} tier.`,
          market_cap: 0,
          stache: {
            certified: true,
            tier: tier || 'BRONZE',
            color: tierColor,
            eligible_for_mint: true
          },
          scanned_at: new Date().toISOString(),
          powered_by: 'ELYSIQ · Registry Sync'
        };

        history.unshift(historyEntry);
        if (history.length > 100) {
          history = history.slice(0, 100);
        }
        await redis.set('elysiq:scan:history', history);
      } catch (historyErr) {
        console.error('Failed to sync registry to scan history:', historyErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error adding registry entry:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
