/**
 * Keeper: swaps stablecoin revenue held by the ElysiqFeeRouter into $ELYSIQ and burns it.
 *
 * Usage:  npx ts-node scripts/keeper_buyback.ts <usdcAmount> [slippageBps]
 *
 * The swap calldata comes from an aggregator quote API (0x / KyberSwap style) configured with
 * SWAP_API_URL. The endpoint must return JSON with `to` (router/target address) and `data`
 * (calldata) plus `buyAmount`. Adapt `fetchQuote` to the aggregator you pick; the contract only
 * accepts targets allowlisted via setSwapTarget() and reverts below `minElysiqOut`.
 */
import 'dotenv/config';
import { createPublicClient, createWalletClient, erc20Abi, getAddress, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { elysium } from '../src/lib/chain/elysium';
import { feeRouterAbi } from '../src/lib/chain/feeRouter';

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function fetchQuote(sellToken: string, buyToken: string, sellAmount: bigint, taker: string) {
  const url = new URL(need('SWAP_API_URL'));
  url.search = new URLSearchParams({ sellToken, buyToken, sellAmount: sellAmount.toString(), taker }).toString();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (process.env.SWAP_API_KEY) headers['0x-api-key'] = process.env.SWAP_API_KEY;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Quote failed: ${res.status} ${await res.text()}`);
  const q = await res.json();
  const to = q.to ?? q.transaction?.to;
  const data = q.data ?? q.transaction?.data;
  const buyAmount = BigInt(q.buyAmount ?? q.minBuyAmount);
  if (!to || !data) throw new Error('Quote response missing to/data');
  return { to: getAddress(to), data: data as `0x${string}`, buyAmount };
}

async function main() {
  const usdcAmount = process.argv[2];
  const slippageBps = BigInt(process.argv[3] ?? '100');
  if (!usdcAmount) throw new Error('Usage: keeper_buyback.ts <usdcAmount> [slippageBps]');

  const router = getAddress(need('ELYSIQ_FEE_ROUTER_ADDRESS'));
  const usdc = getAddress(need('USDC_ADDRESS'));
  const elysiqToken = getAddress(need('ELYSIQ_TOKEN_ADDRESS'));
  const account = privateKeyToAccount(need('KEEPER_PRIVATE_KEY') as `0x${string}`);

  const pub = createPublicClient({ chain: elysium, transport: http() });
  const wallet = createWalletClient({ chain: elysium, transport: http(), account });

  const decimals = await pub.readContract({ address: usdc, abi: erc20Abi, functionName: 'decimals' });
  const amountIn = parseUnits(usdcAmount, decimals);
  const held = await pub.readContract({ address: usdc, abi: erc20Abi, functionName: 'balanceOf', args: [router] });
  if (held < amountIn) throw new Error(`Router only holds ${held} (raw) USDC.`);

  const quote = await fetchQuote(usdc, elysiqToken, amountIn, router);
  const minOut = (quote.buyAmount * (10_000n - slippageBps)) / 10_000n;
  console.log(`Swapping ${usdcAmount} USDC via ${quote.to}, min out ${minOut} (raw $ELYSIQ)`);

  const hash = await wallet.writeContract({
    address: router,
    abi: feeRouterAbi,
    functionName: 'buybackAndBurn',
    args: [usdc, amountIn, minOut, quote.to, quote.data],
  });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  console.log(`Buyback & burn ${receipt.status}: ${hash}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
