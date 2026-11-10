import { createWalletClient, getAddress, http, isAddress, parseAbi, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { elysium, getClient } from '@/lib/chain/elysium';

export const stachePassAbi = parseAbi([
  'function mint(address to, address certifiedToken, uint8 tier, uint8 trustScore) returns (uint256)',
  'function updatePass(address certifiedToken, uint8 tier, uint8 trustScore)',
  'function passOf(address certifiedToken) view returns (uint256)',
  'function passes(uint256 tokenId) view returns (address certifiedToken, uint8 tier, uint8 trustScore, uint64 certifiedAt)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tierOfHolder(address holder) view returns (uint8)',
  'event PassMinted(uint256 indexed tokenId, address indexed certifiedToken, address indexed to, uint8 tier, uint8 trustScore)',
]);

export const TIER_TO_NUM = { BRONZE: 1, GOLD: 2, LEGENDARY: 3 } as const;
export const NUM_TO_TIER = ['NONE', 'BRONZE', 'GOLD', 'LEGENDARY'] as const;
export type TierName = keyof typeof TIER_TO_NUM;

export function stachePassAddress(): Address | null {
  const a = process.env.STACHE_COLLECTION_ADDRESS;
  return a && isAddress(a) ? getAddress(a) : null;
}

export async function getPassTokenId(certifiedToken: Address): Promise<bigint> {
  const pass = stachePassAddress();
  if (!pass) throw new Error('STACHE_COLLECTION_ADDRESS is not configured');
  return getClient().readContract({ address: pass, abi: stachePassAbi, functionName: 'passOf', args: [certifiedToken] });
}

function minterClient() {
  const key = process.env.STACHE_MINTER_PRIVATE_KEY;
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error('STACHE_MINTER_PRIVATE_KEY is not configured');
  const url = elysium.rpcUrls.default.http[0];
  if (!url) throw new Error('ELYSIUM_RPC_URL is not configured');
  return createWalletClient({ account: privateKeyToAccount(key as Hex), chain: elysium, transport: http(url) });
}

export interface MintResult {
  tokenId: bigint;
  txHash: Hex;
  updated: boolean;
}

/** Mints the pass for `certifiedToken` to `to`, or updates the tier if a pass already exists. */
export async function mintOrUpdatePass(to: Address, certifiedToken: Address, tier: TierName, trustScore: number): Promise<MintResult> {
  const pass = stachePassAddress();
  if (!pass) throw new Error('STACHE_COLLECTION_ADDRESS is not configured');
  const wallet = minterClient();
  const pub = getClient();
  const score = Math.max(0, Math.min(100, Math.round(trustScore)));
  const existing = await getPassTokenId(certifiedToken);

  const hash = existing === BigInt(0)
    ? await wallet.writeContract({ address: pass, abi: stachePassAbi, functionName: 'mint', args: [to, certifiedToken, TIER_TO_NUM[tier], score] })
    : await wallet.writeContract({ address: pass, abi: stachePassAbi, functionName: 'updatePass', args: [certifiedToken, TIER_TO_NUM[tier], score] });

  const receipt = await pub.waitForTransactionReceipt({ hash, pollingInterval: 500 });
  if (receipt.status !== 'success') throw new Error('Stache Pass transaction reverted');
  const tokenId = existing === BigInt(0) ? await getPassTokenId(certifiedToken) : existing;
  return { tokenId, txHash: hash, updated: existing !== BigInt(0) };
}
