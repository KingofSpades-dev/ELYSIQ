// src/app/api/elysiq/route.ts

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { HybridSoulProvider } from "@/lib/soul/provider";
import { buildSystemPrompt } from "@/lib/soul/personality";
import { runReflectionPass } from "@/lib/soul/reflect";
import { getSession } from "@/lib/soul/session";

// ── Web Data Scraper & Search ───────────────────────────
async function fetchWebData(query: string): Promise<string> {
  // If it's a URL, fetch the URL and return the text content
  if (/^https?:\/\/[^\s]+$/.test(query)) {
    try {
      const res = await fetch(query, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (!res.ok) return `Failed to fetch page: HTTP ${res.status}`;
      const html = await res.text();
      // Strip script/style tags and clean HTML
      const cleanText = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 5000);
      return cleanText;
    } catch (err: any) {
      return `Error fetching URL: ${err.message}`;
    }
  }

  // DuckDuckGo JSON API
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (res.ok) {
      const data = await res.json();
      let resultsText = "";
      if (data.AbstractText) {
        resultsText += `Abstract: ${data.AbstractText}\n`;
      }
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        resultsText += "Related topics:\n";
        data.RelatedTopics.slice(0, 5).forEach((topic: any) => {
          if (topic.Text) {
            resultsText += `- ${topic.Text}\n`;
          }
        });
      }
      if (resultsText.trim()) {
        return resultsText;
      }
    }
  } catch (e) {
    console.warn("DDG API failed, trying HTML scrape:", e);
  }

  // Scrape DuckDuckGo HTML results page
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!res.ok) return `Failed to perform web search: HTTP ${res.status}`;
    const html = await res.text();
    
    const matches: string[] = [];
    const rx = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = rx.exec(html)) !== null && matches.length < 5) {
      const text = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      matches.push(text);
    }
    
    if (matches.length > 0) {
      return matches.map((m, idx) => `[Result ${idx + 1}] ${m}`).join("\n\n");
    }
    
    return `No search results found for query: ${query}`;
  } catch (err: any) {
    return `Error fetching web search: ${err.message}`;
  }
}

// ── Tool Executor ───────────────────────────────────────────
async function executeTool(
  name: string,
  input: Record<string, string>,
  origin: string
): Promise<Record<string, unknown>> {
  switch (name) {
    case "fetch_web_data": {
      const content = await fetchWebData(input.query);
      return { result: content };
    }
    case "scan_contract_address": {
      try {
        const scanRes = await fetch(`${origin}/api/token/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mint: input.mint })
        });
        if (!scanRes.ok) {
          return { error: `Failed to scan contract: HTTP ${scanRes.status}` };
        }
        const data = await scanRes.json();
        return data;
      } catch (err: any) {
        return { error: `Failed to scan contract: ${err.message}` };
      }
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// Reuse the session loader logic or fallback
async function getSessionWallet(req: NextRequest): Promise<string | null> {
  const sessionId = req.cookies.get('elysiq_session_id')?.value;
  if (!sessionId) return null;
  
  try {
    const session = await getSession(sessionId);
    return session ? session.wallet : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { message, userId, history } = body;

    if (!message) {
      return NextResponse.json({ ok: false, error: "Missing message field" }, { status: 400 });
    }

    // 1. Resolve Identity: Check SIWE session cookie first, then fallback to userId
    const wallet = await getSessionWallet(req);
    const identityKey = wallet || userId || "anonymous-user";

    // 2. Load User Memory
    const soul = new HybridSoulProvider();
    let memory = await soul.load(identityKey);
    if (!memory) {
      memory = soul.createDefaultMemory(identityKey);
    }

    // 3. Construct System Prompt & Env Context (Server Time)
    const timeContext = `\n\n[ENVIRONMENT CONTEXT]\n- Current Server Time: ${new Date().toLocaleString('en-US', { timeZoneName: 'short' })}\n- Current ISO Timestamp: ${new Date().toISOString()}`;
    const systemPrompt = buildSystemPrompt(memory) + timeContext;

    // 4. Invoke Anthropic with Agentic Loop & Tools
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const anthropic = new Anthropic({
      apiKey,
      baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
      defaultHeaders: {
        "api-key": apiKey,
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    const TOOLS: Anthropic.Tool[] = [
      {
        name: "fetch_web_data",
        description: "Fetch live data from the web for a search query or a specific URL.",
        input_schema: {
          type: "object" as const,
          properties: {
            query: {
              type: "string",
              description: "The search query (e.g., 'HYPE price today', 'Elysiq news') or a specific URL to scrape."
            }
          },
          required: ["query"]
        }
      },
      {
        name: "scan_contract_address",
        description: "Scan a token contract address (CA) on Elysium for safety, LP lock, trust score, and market cap.",
        input_schema: {
          type: "object" as const,
          properties: {
            mint: {
              type: "string",
              description: "The token contract address (CA, 0x...) to scan."
            }
          },
          required: ["mint"]
        }
      }
    ];

    const conversationHistory = history || [];
    let currentMessages = [
      ...conversationHistory.map((h: any) => ({
        role: h.role === "assistant" ? "assistant" as const : "user" as const,
        content: h.content
      })),
      { role: "user" as const, content: message }
    ];

    const origin = new URL(req.url).origin;
    let iterations = 0;
    let replyText = "";

    while (iterations < 5) {
      iterations++;
      const response = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        tools: TOOLS,
        messages: currentMessages,
      });

      currentMessages = [
        ...currentMessages,
        { role: "assistant" as const, content: response.content },
      ];

      if (response.stop_reason !== "tool_use") {
        replyText = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        break;
      }

      const toolCalls = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      const toolResults = await Promise.all(
        toolCalls.map(async (t) => ({
          type: "tool_result" as const,
          tool_use_id: t.id,
          content: JSON.stringify(
            await executeTool(t.name, t.input as Record<string, string>, origin)
          ),
        }))
      );
      currentMessages = [
        ...currentMessages,
        { role: "user" as const, content: toolResults },
      ];
    }

    if (!replyText) {
      replyText = "I processed your request, but did not formulate a text response. Please let me know what else you need.";
    }

    // 5. Run Reflection Pass asynchronously in background using clean text transcript
    const cleanTranscript = currentMessages
      .map((m) => {
        let text = "";
        if (typeof m.content === "string") {
          text = m.content;
        } else if (Array.isArray(m.content)) {
          text = m.content
            .map((block: any) => {
              if (block.type === "text") return block.text;
              if (block.type === "tool_use") return `[Calls tool ${block.name} with input ${JSON.stringify(block.input)}]`;
              if (block.type === "tool_result") return `[Tool result: ${block.content}]`;
              return "";
            })
            .filter(Boolean)
            .join("\n");
        }
        return {
          role: m.role,
          content: text.trim()
        };
      })
      .filter((m) => m.content.length > 0);

    runReflectionPass(memory, cleanTranscript)
      .then(async (updatedMemory) => {
        await soul.save(identityKey, updatedMemory);
        console.log(`[SOUL API] Reflection pass succeeded and memory saved for: ${identityKey}`);
      })
      .catch((err) => {
        console.error(`[SOUL API] Reflection pass failed:`, err);
      });

    return NextResponse.json({
      ok: true,
      reply: replyText
    });

  } catch (error: any) {
    console.error("[SOUL API] Error in /api/elysiq:", error);
    return NextResponse.json({ ok: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
