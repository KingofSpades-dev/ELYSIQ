import { erc20Abi, getAddress, isAddress } from 'viem';
import { getClient } from '@/lib/chain/elysium';

// Tier thresholds in whole $ELYSIQ tokens.
const T1 = 1_000;
const T2 = 5_000;
const T3 = 25_000;

// Mock balance registry for local/testing environments only (never consulted in production).
const MOCK_BALANCES: Record<string, number> = {
  '0x00000000000000000000000000000000000a0000': 0,       // Tier 0
  '0x00000000000000000000000000000000000e1151': 1500,    // Tier 1
  '0x000000000000000000000000000000000000a2d4': 8500,    // Tier 2
  '0x000000000000000000000000000000000000b00b': 50000,   // Tier 3
};

/** Whole-token $ELYSIQ balance of `wallet` on Elysium. Returns 0 on any failure. */
export async function balanceFor(wallet: string): Promise<number> {
  if (!isAddress(wallet)) return 0;
  if (process.env.NODE_ENV !== 'production' && wallet.toLowerCase() in MOCK_BALANCES) {
    return MOCK_BALANCES[wallet.toLowerCase()];
  }
  const token = process.env.ELYSIQ_TOKEN_ADDRESS;
  if (!token || !isAddress(token)) return 0;
  try {
    const client = getClient();
    const t = { address: getAddress(token), abi: erc20Abi } as const;
    const [raw, decimals] = await Promise.all([
      client.readContract({ ...t, functionName: 'balanceOf', args: [getAddress(wallet)] }),
      client.readContract({ ...t, functionName: 'decimals' }),
    ]);
    return Number(raw) / Math.pow(10, decimals);
  } catch (error) {
    console.error('[access] balance fetch error:', error);
    return 0;
  }
}

export function tierForBalance(balance: number): 0 | 1 | 2 | 3 {
  if (balance >= T3) return 3;
  if (balance >= T2) return 2;
  if (balance >= T1) return 1;
  return 0;
}

export async function tierFor(wallet: string): Promise<0 | 1 | 2 | 3> {
  return tierForBalance(await balanceFor(wallet));
}
