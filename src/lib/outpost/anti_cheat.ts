// Simple server-side rate limits & transaction validations to prevent cheat intents
const LAST_ACTION_TIMES = new Map<string, number>();

export function checkRateLimit(wallet: string, minIntervalMs = 200): boolean {
  const now = Date.now();
  const last = LAST_ACTION_TIMES.get(wallet) || 0;
  if (now - last < minIntervalMs) {
    return false; // Action too fast
  }
  LAST_ACTION_TIMES.set(wallet, now);
  return true;
}

export function validateActionIntent(actionId: string, processedIds: Set<string>): boolean {
  if (processedIds.has(actionId)) {
    return false; // Replay attack detected
  }
  processedIds.add(actionId);
  return true;
}
