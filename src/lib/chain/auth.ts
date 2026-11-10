import { isAddress, verifyMessage, type Hex } from 'viem';

const MAX_MESSAGE_AGE_MS = 5 * 60 * 1000;
const isProd = () => process.env.NODE_ENV === 'production';

/**
 * Verifies an EIP-191 (personal_sign) signature made by `address` over `message`.
 * Simulated signatures ("sim_sig_*") are accepted only outside production.
 */
export async function verifyWalletSignature(address: string, message: string, signature: string): Promise<boolean> {
  if (!isAddress(address)) return false;
  if (!isProd() && signature.startsWith('sim_sig_')) return true;
  if (!/^0x[0-9a-fA-F]+$/.test(signature)) return false;
  try {
    return await verifyMessage({ address, message, signature: signature as Hex });
  } catch {
    return false;
  }
}

/** Sign-in messages embed `Timestamp: <ms>`; reject stale or future-dated ones. */
export function isFreshMessage(message: string): boolean {
  const m = /Timestamp:\s*(\d{10,})/.exec(message);
  if (!m) return false;
  const age = Date.now() - Number(m[1]);
  return age >= -30_000 && age <= MAX_MESSAGE_AGE_MS;
}

/** The signed message must name the wallet that is signing in. */
export function messageNamesWallet(message: string, address: string): boolean {
  return message.toLowerCase().includes(address.toLowerCase());
}
