import { NextRequest, NextResponse } from 'next/server';
import { normalizeAddress } from '@/lib/chain/elysium';
import { verifyFeeReceipt } from '@/lib/token/receipt';

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url, token });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData().catch(() => null);
    if (!data) {
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      );
    }

    const projectName = data.get('projectName') as string;
    const twitterHandle = data.get('twitterHandle') as string;
    const rawContractAddress = data.get('contractAddress') as string;
    const paymentTx = data.get('paymentSignature');
    const contactEmail = data.get('contactEmail') as string;
    const file = data.get('mascotImage') as unknown as File | null;

    const contractAddress = rawContractAddress ? normalizeAddress(rawContractAddress.trim()) : null;
    if (!projectName || !contractAddress) {
      return NextResponse.json(
        { error: 'Project name and a valid contract address are required' },
        { status: 400 }
      );
    }

    // The registry fee must have been paid on-chain through the fee router for this exact address.
    // The payer becomes the project's registrant: the only wallet allowed to claim its Stache Pass.
    const payment = await verifyFeeReceipt(paymentTx, contractAddress);
    if (!payment.ok) {
      return NextResponse.json({ error: 'Registry fee payment could not be verified on-chain' }, { status: 403 });
    }

    let mascotUrlToSave = '/mascot.png';
    let base64MascotData = null;

    if (file && file.size > 0) {
      // Limit size to 2MB to prevent Upstash Redis payload size limits
      if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Mascot image must be less than 2MB' },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split('.').pop() || 'png';
      const base64Data = buffer.toString('base64');
      const mimeType = ext === 'svg' ? 'image/svg+xml' : (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`);
      base64MascotData = `data:${mimeType};base64,${base64Data}`;
      mascotUrlToSave = `/api/stache/mascot/${contractAddress}`;
    }

    const applicationId = `app_${crypto.randomUUID()}`;
    const newApp = {
      applicationId,
      projectName,
      twitterHandle,
      contractAddress,
      mascotImageUrl: mascotUrlToSave,
      contactEmail,
      registrant: payment.payer,
      paymentTx,
      status: 'pending',
      appliedAt: new Date().toISOString(),
    };

    const redis = await getRedis();
    if (redis) {
      // Save mascot image data separately in Redis if present
      if (base64MascotData) {
        await redis.set(`elysiq:stache:mascot:${contractAddress}`, base64MascotData);
      }

      // 1. Save application details
      await redis.lpush('elysiq:stache:applications', newApp);

      // 2. Add to registry list as a pending project
      const projects = await redis.get<any[]>('elysiq:stache:projects') || [];
      
      // Avoid duplicate listing
      const exists = projects.some((p) => p.contractAddress?.toLowerCase() === contractAddress.toLowerCase() || p.project.toLowerCase() === projectName.toLowerCase());
      if (!exists) {
        projects.unshift({
          project: projectName,
          status: 'Pending',
          trustScore: null,
          date: new Date().toISOString().split('T')[0],
          certifiedBy: 'ELYSIQ',
          contractAddress: contractAddress,
          registrant: payment.payer,
          mascotUrl: mascotUrlToSave,
        });
        await redis.set('elysiq:stache:projects', projects);
      }
    }

    return NextResponse.json({ applicationId, status: 'pending' });
  } catch (error: any) {
    console.error('Error submitting application:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
