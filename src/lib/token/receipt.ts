import { decodeEventLog, erc20Abi, getAddress, isAddress, isHash, keccak256, parseEventLogs, parseUnits, toHex } from 'viem';
import { getClient } from '@/lib/chain/elysium';
import { feeRouterAbi } from '@/lib/chain/feeRouter';

/**
 * Verifies a pay-with-$ELYSIQ receipt on-chain.
 *
 * A receipt is valid when the given transaction:
 *   1. succeeded on Elysium,
 *   2. contains an ERC-20 Transfer on the $ELYSIQ token,
 *   3. from the session wallet to the treasury,
 *   4. for at least the deep scan fee,
 * and has not been redeemed before (replay protection via Redis SET NX).
 *
 * Nothing here trusts a client-supplied header or claim: only chain state counts.
 */
export async function hasValidScanReceipt(
  wallet: string,
  txHash: unknown,
  redis: { set: (key: string, value: string, opts: { nx: true; ex: number }) => Promise<unknown> } | null,
): Promise<boolean> {
  const token = process.env.ELYSIQ_TOKEN_ADDRESS;
  const treasury = process.env.ELYSIQ_FEE_ROUTER_ADDRESS || process.env.ELYSIQ_TREASURY_ADDRESS;
  const feeRaw = process.env.SCAN_FEE_DEEP_ELYSIQ;
  if (!token || !treasury || !feeRaw) return false;
  if (typeof txHash !== 'string' || !isHash(txHash)) return false;
  if (!isAddress(wallet) || !isAddress(token) || !isAddress(treasury)) return false;
  if (!redis) return false; // without replay protection a receipt could be reused forever

  try {
    const client = getClient();
    const [receipt, decimals] = await Promise.all([
      client.getTransactionReceipt({ hash: txHash }),
      client.readContract({ address: getAddress(token), abi: erc20Abi, functionName: 'decimals' }),
    ]);
    if (receipt.status !== 'success') return false;
    const minAmount = parseUnits(feeRaw, decimals);

    const paid = receipt.logs.some((log) => {
      if (log.address.toLowerCase() !== token.toLowerCase()) return false;
      try {
        const ev = decodeEventLog({ abi: erc20Abi, data: log.data, topics: log.topics });
        return (
          ev.eventName === 'Transfer' &&
          ev.args.from.toLowerCase() === wallet.toLowerCase() &&
          ev.args.to.toLowerCase() === treasury.toLowerCase() &&
          ev.args.value >= minAmount
        );
      } catch {
        return false;
      }
    });
    if (!paid) return false;

    // One receipt buys one scan.
    const first = await redis.set(`elysiq:scan:receipt:${txHash.toLowerCase()}`, wallet, { nx: true, ex: 60 * 60 * 24 * 30 });
    return first !== null;
  } catch (error) {
    console.error('[receipt] verification failed:', error);
    return false;
  }
}

// ── Router fee receipts (scan / registry payments made through ElysiqFeeRouter) ──

export interface ReceiptRedis {
  set: (key: string, value: string, opts: { nx: true; ex: number }) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
}

export type FeeReceiptCheck = { ok: true; payer: string; token: string; amount: bigint } | { ok: false };

/**
 * Pure on-chain check (does not mark anything as used): `txHash` must be a successful
 * ElysiqFeeRouter `FeePaid` event whose `ref` equals keccak256(lowercase `scannedAddress`),
 * paid in $ELYSIQ or USDC for at least the scan fee. Returns the payer from the event.
 */
export async function verifyFeeReceipt(txHash: unknown, scannedAddress: string): Promise<FeeReceiptCheck> {
  const routerEnv = process.env.ELYSIQ_FEE_ROUTER_ADDRESS;
  const elysiqEnv = process.env.ELYSIQ_TOKEN_ADDRESS;
  const usdcEnv = process.env.USDC_ADDRESS;
  if (!routerEnv || !elysiqEnv || !isAddress(routerEnv) || !isAddress(elysiqEnv)) return { ok: false };
  if (typeof txHash !== 'string' || !isHash(txHash)) return { ok: false };

  try {
    const client = getClient();
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== 'success') return { ok: false };

    const routerLogs = receipt.logs.filter((l) => l.address.toLowerCase() === routerEnv.toLowerCase());
    const events = parseEventLogs({ abi: feeRouterAbi, logs: routerLogs, eventName: 'FeePaid' });
    const wantedRef = keccak256(toHex(scannedAddress.toLowerCase()));

    const feeFor = async (token: string, fee: string) => {
      const decimals = await client.readContract({ address: getAddress(token), abi: erc20Abi, functionName: 'decimals' });
      return parseUnits(fee, decimals);
    };
    const minElysiq = await feeFor(elysiqEnv, process.env.SCAN_FEE_ELYSIQ || process.env.NEXT_PUBLIC_SCAN_FEE_ELYSIQ || '3000');
    const minUsdc = usdcEnv && isAddress(usdcEnv)
      ? await feeFor(usdcEnv, process.env.SCAN_FEE_USDC || process.env.NEXT_PUBLIC_SCAN_FEE_USDC || '1')
      : null;

    for (const e of events) {
      if (e.args.ref.toLowerCase() !== wantedRef.toLowerCase()) continue;
      const t = e.args.token.toLowerCase();
      const enough =
        (t === elysiqEnv.toLowerCase() && e.args.amount >= minElysiq) ||
        (minUsdc !== null && t === usdcEnv!.toLowerCase() && e.args.amount >= minUsdc);
      if (enough) return { ok: true, payer: e.args.payer, token: e.args.token, amount: e.args.amount };
    }
    return { ok: false };
  } catch (error) {
    console.error('[receipt] fee receipt verification failed:', error);
    return { ok: false };
  }
}

/** Verifies the receipt (see verifyFeeReceipt) and marks it as used. Returns the Redis key to release if the scan then fails. */
export async function consumeFeeReceipt(
  txHash: unknown,
  scannedAddress: string,
  redis: ReceiptRedis | null,
): Promise<{ ok: true; key: string } | { ok: false }> {
  if (!redis) return { ok: false };
  const check = await verifyFeeReceipt(txHash, scannedAddress);
  if (!check.ok) return { ok: false };
  try {
    const key = `elysiq:scan:receipt:${String(txHash).toLowerCase()}`;
    const first = await redis.set(key, scannedAddress.toLowerCase(), { nx: true, ex: 60 * 60 * 24 * 30 });
    return first === null ? { ok: false } : { ok: true, key };
  } catch (error) {
    console.error('[receipt] could not mark receipt as used:', error);
    return { ok: false };
  }
}
