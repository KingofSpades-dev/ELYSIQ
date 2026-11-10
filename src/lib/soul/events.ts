// src/lib/soul/events.ts

import { HybridSoulProvider } from "./provider";

/**
 * Helper to log a user token scan event to their Soul memory.
 */
export async function logScanEvent(walletOrUserId: string, mintAddress: string, tokenName: string): Promise<void> {
  try {
    const soul = new HybridSoulProvider();
    await soul.logEvent(walletOrUserId, {
      kind: 'SCAN_TOKEN',
      detail: `Scanned token ${tokenName} (${mintAddress})`
    });
    console.log(`[SOUL EVENT] Logged SCAN_TOKEN for ${walletOrUserId}: ${tokenName}`);
  } catch (err) {
    console.error("[SOUL EVENT] Failed to log scan event:", err);
  }
}

/**
 * Helper to log an avoided rug pull event to their Soul memory.
 */
export async function logAvoidedRugEvent(walletOrUserId: string, mintAddress: string, tokenName: string, riskLevel: string): Promise<void> {
  try {
    const soul = new HybridSoulProvider();
    await soul.logEvent(walletOrUserId, {
      kind: 'AVOIDED_RUG',
      detail: `Avoided high-risk rug on ${tokenName} (${mintAddress}) marked as ${riskLevel} risk`
    });
    
    // Also increment rugsAvoided counter in permanent profile structure
    const memory = await soul.load(walletOrUserId);
    if (memory) {
      memory.security.rugsAvoided += 1;
      if (!memory.security.riskyProjectsViewed.includes(mintAddress)) {
        memory.security.riskyProjectsViewed.push(mintAddress);
      }
      await soul.save(walletOrUserId, memory);
    }
    console.log(`[SOUL EVENT] Logged AVOIDED_RUG for ${walletOrUserId}: ${tokenName}`);
  } catch (err) {
    console.error("[SOUL EVENT] Failed to log avoided rug event:", err);
  }
}

/**
 * Helper to log a wallet connection event.
 */
export async function logConnectedWalletEvent(walletOrUserId: string, chain: string): Promise<void> {
  try {
    const soul = new HybridSoulProvider();
    await soul.logEvent(walletOrUserId, {
      kind: 'CONNECTED_WALLET',
      detail: `Connected wallet on ${chain}`
    });
    
    const memory = await soul.load(walletOrUserId);
    if (memory) {
      if (!memory.security.preferredChains.includes(chain)) {
        memory.security.preferredChains.push(chain);
      }
      await soul.save(walletOrUserId, memory);
    }
    console.log(`[SOUL EVENT] Logged CONNECTED_WALLET for ${walletOrUserId} on ${chain}`);
  } catch (err) {
    console.error("[SOUL EVENT] Failed to log connected wallet event:", err);
  }
}
