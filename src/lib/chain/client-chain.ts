import { defineChain } from 'viem';

/** Elysium chain definition for browser code (NEXT_PUBLIC_* env only). */
export const elysiumClientChain = defineChain({
  id: 99901,
  name: 'Elysium',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_ELYSIUM_RPC_URL || 'http://localhost:8545'] } },
  blockExplorers: { default: { name: 'Elysium Explorer', url: process.env.NEXT_PUBLIC_ELYSIUM_EXPLORER_URL || '' } },
});
