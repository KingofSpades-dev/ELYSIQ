import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
  defaultHeaders: {
    "api-key": process.env.ANTHROPIC_API_KEY!,
    "Authorization": `Bearer ${process.env.ANTHROPIC_API_KEY!}`,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Input is required" },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 600,
      system: `Crypto forensics scanner. Return ONLY raw JSON, no markdown, no backticks: {"detected_type":"string","chain":"string","is_valid":boolean,"risk_level":"SAFE"|"LOW"|"MEDIUM"|"HIGH"|"CRITICAL","findings":["string"],"recovery_possible":boolean,"recovery_difficulty":"EASY"|"MEDIUM"|"HARD"|"EXTREME"|"N/A","next_steps":["string"]}`,
      messages: [{ role: "user", content: `Analyze: ${input}` }],
    });

    const raw =
      response.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text"
      )?.text || "{}";

    // Parse the JSON response
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({ result: parsed });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
