'use client';

import { createPublicClient, createWalletClient, custom, erc20Abi, getAddress, keccak256, parseUnits, toHex, type Address } from 'viem';
import { elysiumClientChain } from '@/lib/chain/client-chain';
import { feeRouterAbi } from '@/lib/chain/feeRouter';
import { ensureElysium, type EvmProvider } from '@/lib/chain/wallet-client';

export type PayMethod = 'USDC' | 'ELYSIQ';

const env = {
  router: process.env.NEXT_PUBLIC_FEE_ROUTER_ADDRESS,
  elysiq: process.env.NEXT_PUBLIC_ELYSIQ_TOKEN_ADDRESS,
  usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS,
};

export const SCAN_FEE_USDC = process.env.NEXT_PUBLIC_SCAN_FEE_USDC || '1';
export const SCAN_FEE_ELYSIQ = process.env.NEXT_PUBLIC_SCAN_FEE_ELYSIQ || '3000';

export function feeLabel(method: PayMethod): string {
  return method === 'USDC' ? `${SCAN_FEE_USDC} USDC` : `${SCAN_FEE_ELYSIQ} ELYSIQ`;
}

/**
 * Pays the scan/registry fee through the ElysiqFeeRouter: checks balance, approves exactly the
 * fee if needed, calls payFee / payFeeStable and waits for the receipt. Returns the tx hash.
 */
export async function payFee(provider: EvmProvider, account: string, method: PayMethod, refText: string): Promise<`0x${string}`> {
  if (!env.router || !env.elysiq || (method === 'USDC' && !env.usdc)) {
    throw new Error('Payments are not configured yet (router / token addresses missing).');
  }
  await ensureElysium(provider);

  const router = getAddress(env.router);
  const token = getAddress(method === 'USDC' ? env.usdc! : env.elysiq) as Address;
  const from = getAddress(account);
  const transport = custom(provider);
  const pub = createPublicClient({ chain: elysiumClientChain, transport, pollingInterval: 500 });
  const wallet = createWalletClient({ chain: elysiumClientChain, transport, account: from });

  const decimals = await pub.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' });
  const amount = parseUnits(method === 'USDC' ? SCAN_FEE_USDC : SCAN_FEE_ELYSIQ, decimals);

  const balance = await pub.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [from] });
  if (balance < amount) throw new Error(`Insufficient ${method} balance. You need ${feeLabel(method)}.`);

  const allowance = await pub.readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [from, router] });
  if (allowance < amount) {
    const approveHash = await wallet.writeContract({ address: token, abi: erc20Abi, functionName: 'approve', args: [router, amount] });
    await pub.waitForTransactionReceipt({ hash: approveHash });
  }

  const ref = keccak256(toHex(refText.toLowerCase()));
  const hash = method === 'ELYSIQ'
    ? await wallet.writeContract({ address: router, abi: feeRouterAbi, functionName: 'payFee', args: [amount, ref] })
    : await wallet.writeContract({ address: router, abi: feeRouterAbi, functionName: 'payFeeStable', args: [token, amount, ref] });

  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('Payment transaction failed on-chain.');
  return hash;
}
