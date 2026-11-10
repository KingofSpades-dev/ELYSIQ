import { erc20Abi, formatUnits, getAddress, isAddress, type Address } from 'viem';
import { getClient } from '@/lib/chain/elysium';
import { DEAD_ADDRESS, feeRouterAbi } from '@/lib/chain/feeRouter';

export interface BurnTx {
  timestamp: string;
  source_asset: string;
  amount: number;
  elysiq_received: number;
  tx_signature: string;
  status: string;
  type: string;
}

const HISTORY_KEY = 'elysiq:burn:history';
const CURSOR_KEY = 'elysiq:burn:cursor';
const MAX_HISTORY = 100;
// Elysium caps eth_getLogs by result count (10,000 logs), not block span, and blocks are ~100 ms.
// Start wide and halve the window whenever the node refuses it.
const LOG_CHUNK_START = 50_000n;

function addr(name: string): Address | null {
  const v = process.env[name];
  return v && isAddress(v) ? getAddress(v) : null;
}

async function whole(token: Address, owner: Address): Promise<number> {
  const client = getClient();
  const [raw, decimals] = await Promise.all([
    client.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [owner] }),
    client.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' }),
  ]);
  return Number(formatUnits(raw, decimals));
}

/** On-chain totals: everything sent to the dead address, plus router stablecoin and $ELYSIQ balances. */
export async function getBurnTotals() {
  const token = addr('ELYSIQ_TOKEN_ADDRESS');
  const router = addr('ELYSIQ_FEE_ROUTER_ADDRESS');
  const usdc = addr('USDC_ADDRESS');
  if (!token) return { total_burned: 0, treasury_balance: 0, escrow_balance: 0, configured: false };
  const [burned, stable, escrow] = await Promise.all([
    whole(token, DEAD_ADDRESS).catch(() => 0),
    router && usdc ? whole(usdc, router).catch(() => 0) : Promise.resolve(0),
    router ? whole(token, router).catch(() => 0) : Promise.resolve(0),
  ]);
  return { total_burned: burned, treasury_balance: stable, escrow_balance: escrow, configured: true };
}

interface RedisLike {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
}

/**
 * Reads new FeePaid / BuybackBurned events from the router (resuming from a stored cursor) and
 * prepends them to the burn history kept in Redis. Safe to call repeatedly.
 */
export async function syncBurnLogs(redis: RedisLike, maxChunks = 10): Promise<{ added: number; upTo: string }> {
  const router = addr('ELYSIQ_FEE_ROUTER_ADDRESS');
  const token = addr('ELYSIQ_TOKEN_ADDRESS');
  if (!router || !token) return { added: 0, upTo: '0' };

  const client = getClient();
  const head = await client.getBlockNumber();
  const stored = await redis.get<string>(CURSOR_KEY);
  let from = stored ? BigInt(stored) + 1n : BigInt(process.env.ELYSIQ_ROUTER_DEPLOY_BLOCK || '0');
  if (from > head) return { added: 0, upTo: head.toString() };

  const decimals = await client.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' });
  const found: BurnTx[] = [];
  let cursor = from - 1n;

  let chunk = LOG_CHUNK_START;
  for (let i = 0; i < maxChunks && from <= head; ) {
    const to = from + chunk - 1n > head ? head : from + chunk - 1n;
    let paid, buybacks;
    try {
      [paid, buybacks] = await Promise.all([
        client.getContractEvents({ address: router, abi: feeRouterAbi, eventName: 'FeePaid', fromBlock: from, toBlock: to }),
        client.getContractEvents({ address: router, abi: feeRouterAbi, eventName: 'BuybackBurned', fromBlock: from, toBlock: to }),
      ]);
    } catch (err: any) {
      if (chunk > 1n && /limit|range|too (many|large)|32005/i.test(String(err?.message || err))) {
        chunk = chunk / 2n;
        continue; // retry the same window, smaller
      }
      throw err;
    }
    i++;

    for (const log of [...paid, ...buybacks]) {
      const block = await client.getBlock({ blockNumber: log.blockNumber! });
      const timestamp = new Date(Number(block.timestamp) * 1000).toISOString();
      if (log.eventName === 'FeePaid') {
        const a = log.args as { token: Address; burned: bigint };
        if (a.token.toLowerCase() !== token.toLowerCase() || a.burned === 0n) continue;
        const burned = Number(formatUnits(a.burned, decimals));
        found.push({ timestamp, source_asset: 'ELYSIQ', amount: burned, elysiq_received: burned, tx_signature: log.transactionHash!, status: 'SUCCESS', type: 'instant_burn' });
      } else {
        const a = log.args as { stableIn: bigint; elysiqBurned: bigint };
        const stableDecimals = 6; // USDC; display only
        found.push({
          timestamp, source_asset: 'USDC', amount: Number(formatUnits(a.stableIn, stableDecimals)),
          elysiq_received: Number(formatUnits(a.elysiqBurned, decimals)), tx_signature: log.transactionHash!,
          status: 'SUCCESS', type: 'cron_usdc_buyback_burn',
        });
      }
    }
    cursor = to;
    from = to + 1n;
  }

  if (found.length > 0) {
    const existing = (await redis.get<BurnTx[]>(HISTORY_KEY)) || [];
    const merged = [...found.reverse(), ...existing].slice(0, MAX_HISTORY);
    await redis.set(HISTORY_KEY, merged);
  }
  await redis.set(CURSOR_KEY, cursor.toString());
  return { added: found.length, upTo: cursor.toString() };
}

export async function getBurnHistory(redis: RedisLike | null): Promise<BurnTx[]> {
  if (!redis) return [];
  return (await redis.get<BurnTx[]>(HISTORY_KEY)) || [];
}
