// src/lib/elysiq.ts

export interface ElysiqRequestBody {
  message: string;
  sessionId: string;
  userId: string;
  clientType: "web-app";
  history: { role: string; content: string }[];
}

export interface ElysiqResponseData {
  ok: boolean;
  reply: string;
  error?: string;
}

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "elysiq-ssr";
  const key = "elysiq_uid";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const uid = "elysiq-user-" + Math.random().toString(36).slice(2, 11);
  localStorage.setItem(key, uid);
  return uid;
}

export function createSessionId(): string {
  return "elysiq-session-" + Math.random().toString(36).slice(2, 11);
}
