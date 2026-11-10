// src/lib/soul/reflect.ts

import Anthropic from "@anthropic-ai/sdk";
import { UserMemory, MemoryEvent, MemoryFact } from "./types";

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({
    apiKey,
    baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
    defaultHeaders: {
      "api-key": apiKey,
      "Authorization": `Bearer ${apiKey}`,
    },
  });
}

interface ReflectedData {
  role?: string;
  summary?: string;
  preferences?: {
    riskTolerance?: 'low' | 'medium' | 'high';
    likesMemecoins?: boolean;
    customPreferences?: Record<string, string>;
  };
  facts?: Array<{
    text: string;
    confidence: number;
    importance: number;
    lifespanDays?: number; // Estimated duration in days this fact remains relevant
  }>;
}

/**
 * Runs a reflection pass using Anthropic Claude to distill chat transcripts into structured memory.
 */
export async function runReflectionPass(
  currentMemory: UserMemory,
  chatTranscript: Array<{ role: string; content: string }>
): Promise<UserMemory> {
  const client = getAnthropicClient();
  if (!client) {
    console.warn("[SOUL REFLECT] Anthropic client not configured. Skipping reflection pass.");
    return currentMemory;
  }

  const confidenceThreshold = parseFloat(process.env.SOUL_REFLECTION_CONFIDENCE_THRESHOLD || "0.7");
  const importanceThreshold = parseFloat(process.env.SOUL_REFLECTION_IMPORTANCE_THRESHOLD || "0.5");

  const systemPrompt = `You are ELYSIQ's Soul Reflection Engine. Your job is to analyze the conversation between the user and ELYSIQ, review their history, and output structured memory updates.
You must return ONLY a valid JSON object matching the following structure:
{
  "role": "e.g. Trader, NFT Collector, DeFi Degen, Developer",
  "summary": "Updated concise paragraph summary of the user's personality, behavior patterns, and relationship history with ELYSIQ",
  "preferences": {
    "riskTolerance": "low" | "medium" | "high",
    "likesMemecoins": true | false,
    "customPreferences": { "key": "value" }
  },
  "facts": [
    { "text": "Durable statement of fact about the user", "confidence": 0.0 to 1.0, "importance": 0.0 to 1.0, "lifespanDays": number (optional, e.g. 90 for transient things like currently holding BONK, or leave undefined for permanent facts) }
  ]
}

Ensure to:
1. Extract new facts carefully. Give low confidence to uncertain statements.
2. Give low importance to trivial details (e.g. they ate lunch) and high importance to security relevant details (e.g. preferred wallets, risk choices, token holdings).
3. Update the summary dynamically, taking into account recent events and prior summary.
4. ONLY return valid JSON. Do not include markdown codeblocks or any additional conversational text.`;

  const userPrompt = `
[Prior User Memory]
${JSON.stringify({
  profile: currentMemory.profile,
  preferences: currentMemory.preferences,
  security: currentMemory.security
}, null, 2)}

[Recent Chat Session Transcript]
${chatTranscript.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}
`;

  try {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    // Parse the JSON output
    const cleanJsonText = text.replace(/^```json/, "").replace(/```$/, "").trim();
    const result = JSON.parse(cleanJsonText) as ReflectedData;

    // 1. Update Profile Role and Summary
    if (result.role) currentMemory.profile.role = result.role;
    if (result.summary) {
      currentMemory.profile.summary = result.summary;
      currentMemory.profile.lastConfirmedAt = new Date().toISOString();
    }

    // 2. Update Preferences
    if (result.preferences) {
      if (result.preferences.riskTolerance) {
        currentMemory.preferences.riskTolerance = result.preferences.riskTolerance;
      }
      if (result.preferences.likesMemecoins !== undefined) {
        currentMemory.preferences.likesMemecoins = result.preferences.likesMemecoins;
      }
      if (result.preferences.customPreferences) {
        currentMemory.preferences.customPreferences = {
          ...currentMemory.preferences.customPreferences,
          ...result.preferences.customPreferences
        };
      }
    }

    // 3. Filter and Add Facts (Check Confidence and Importance thresholds)
    if (Array.isArray(result.facts)) {
      const now = new Date();
      result.facts.forEach(f => {
        if (f.confidence >= confidenceThreshold && f.importance >= importanceThreshold) {
          // Check if fact already exists to prevent duplication
          const exists = currentMemory.preferences.customPreferences[f.text];
          if (!exists) {
            let expiresAt: string | undefined = undefined;
            if (f.lifespanDays) {
              const expiryDate = new Date();
              expiryDate.setDate(now.getDate() + f.lifespanDays);
              expiresAt = expiryDate.toISOString();
            }
            // Save facts to customPreferences for simplicity or extend UserMemory to hold facts array if desired
            currentMemory.preferences.customPreferences[f.text] = JSON.stringify({
              confidence: f.confidence,
              importance: f.importance,
              expiresAt,
              addedAt: now.toISOString()
            });
          }
        }
      });
    }

    // 4. Prune Expired Facts
    const nowStr = new Date().toISOString();
    Object.entries(currentMemory.preferences.customPreferences).forEach(([key, valStr]) => {
      try {
        const parsed = JSON.parse(valStr);
        if (parsed.expiresAt && parsed.expiresAt < nowStr) {
          delete currentMemory.preferences.customPreferences[key];
          console.log(`[SOUL REFLECT] Pruned expired fact: ${key}`);
        }
      } catch {
        // Not a structured fact string, keep it as regular preference
      }
    });

    currentMemory.updatedAt = new Date().toISOString();
    return currentMemory;
  } catch (err) {
    console.error("[SOUL REFLECT] Error parsing or running reflection pass:", err);
    return currentMemory;
  }
}
