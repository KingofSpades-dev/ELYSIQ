import { NextRequest, NextResponse } from "next/server";

async function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import("@upstash/redis");
  return new Redis({ url, token });
}

async function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  const { Resend } = await import("resend");
  return new Resend(process.env.RESEND_API_KEY);
}

export async function GET() {
  const redis = await getRedis();
  if (!redis) return NextResponse.json({ count: 0 });
  const count = await redis.get<number>("elysiq:waitlist:count");
  return NextResponse.json({ count: count || 0 });
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email?.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const [redis, resend] = await Promise.all([getRedis(), getResend()]);

  const tasks: Promise<unknown>[] = [];

  if (redis) tasks.push(redis.incr("elysiq:waitlist:count"));

  if (resend) {
    tasks.push(
      resend.emails.send({
        from: "ELYSIQ <noreply@elysiq.xyz>",
        to: email,
        subject: "The chain remembers.",
        html: `
          <div style="font-family:Georgia,serif;max-width:480px;padding:40px;background:#F5F0E8;color:#1A1814">
            <p style="font-family:monospace;font-size:11px;letter-spacing:.2em;color:#D4633A;margin-bottom:24px">ELYSIQ · THE ARCHIVISTS</p>
            <h1 style="font-weight:300;font-size:32px;margin-bottom:16px;line-height:1.1">
              You are registered.<br>
              <em style="color:#D4633A">The return is approaching.</em>
            </h1>
            <p style="font-size:14px;line-height:1.8;color:#D4633A;margin-bottom:24px">
              Wallet Analyzer launches in 3 days.<br>
              You will be the first to know.
            </p>
            <p style="font-family:monospace;font-size:11px;color:#8A8880;letter-spacing:.08em">
              ELYSIQ · elysiq.xyz · $ELYSIQ<br>
              "The chain never forgets."
            </p>
          </div>
        `,
      })
    );

    if (process.env.NOTIFY_EMAIL) {
      tasks.push(
        resend.emails.send({
          from: "ELYSIQ <noreply@elysiq.xyz>",
          to: process.env.NOTIFY_EMAIL,
          subject: `New Archivist: ${email}`,
          text: `New waitlist signup: ${email}`,
        })
      );
    }
  }

  try {
    await Promise.all(tasks);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
