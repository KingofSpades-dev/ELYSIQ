'use client';

// Browser-side helper for injected EVM wallets (MetaMask, Rabby, Coinbase Wallet, ...).

export interface EvmProvider {
  request(args: { method: string; params?: unknown[] }): Promise<any>;
}

export const ELYSIUM_CHAIN_ID_HEX = '0x1863d'; // 99901

export function getEvmProvider(): EvmProvider | null {
  const eth = (typeof window !== 'undefined' ? (window as any).ethereum : null) as EvmProvider | null;
  return eth ?? null;
}

export async function connectEvmWallet(): Promise<{ provider: EvmProvider; address: string }> {
  const provider = getEvmProvider();
  if (!provider) throw new Error('No EVM wallet found. Install MetaMask or Rabby.');
  const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
  if (!accounts?.[0]) throw new Error('No account selected.');
  return { provider, address: accounts[0] };
}

export async function signMessage(provider: EvmProvider, address: string, message: string): Promise<string> {
  return provider.request({ method: 'personal_sign', params: [message, address] });
}

/** Asks the wallet to switch to Elysium, adding the chain first if needed. */
export async function ensureElysium(provider: EvmProvider): Promise<void> {
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ELYSIUM_CHAIN_ID_HEX }] });
  } catch (err: any) {
    if (err?.code !== 4902) throw err;
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: ELYSIUM_CHAIN_ID_HEX,
        chainName: 'Elysium',
        nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
        rpcUrls: [process.env.NEXT_PUBLIC_ELYSIUM_RPC_URL || ''].filter(Boolean),
        blockExplorerUrls: [process.env.NEXT_PUBLIC_ELYSIUM_EXPLORER_URL || ''].filter(Boolean),
      }],
    });
  }
}
