import {
  createPublicClient,
  defineChain,
  erc20Abi,
  fallback,
  getAddress,
  http,
  isAddress,
  parseAbi,
  type Address,
  type PublicClient,
} from 'viem';

// Do NOT import `elysiumTestnet` from 'viem/chains': that is a different chain (Vulcan Forged, ID 1338).
export const ELYSIUM_CHAIN_ID = 99901;

const explorerUrl = process.env.ELYSIUM_EXPLORER_URL || '';
const rpcUrls = rpcList();

export const elysium = defineChain({
  id: ELYSIUM_CHAIN_ID,
  name: 'Elysium',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: { default: { http: rpcUrls } },
  blockExplorers: { default: { name: 'Elysium Explorer', url: explorerUrl } },
});

function rpcList(): string[] {
  const urls = [process.env.ELYSIUM_RPC_URL, process.env.ELYSIUM_RPC_FALLBACK_URL]
    .filter((u): u is string => !!u && !/YOUR_KEY|YOUR_API_KEY/.test(u));
  return Array.from(new Set(urls));
}

let _client: PublicClient | null = null;

/** Shared public client. Tries the primary RPC first, then the fallback. */
export function getClient(): PublicClient {
  if (!_client) {
    const urls = rpcList();
    if (urls.length === 0) throw new Error('ELYSIUM_RPC_URL is not configured');
    _client = createPublicClient({
      chain: elysium,
      transport: fallback(urls.map((u) => http(u))),
    }) as PublicClient;
  }
  return _client;
}

/** Validates and checksums an address. Returns null when invalid. */
export function normalizeAddress(addr: string): Address | null {
  return isAddress(addr, { strict: false }) ? getAddress(addr) : null;
}

export interface TokenMetadata {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  owner: Address | null;
  creator: Address | null;
}

const ownableAbi = parseAbi(['function owner() view returns (address)']);

/** ERC-20 metadata via a single multicall (Multicall3). Replaces the DAS `getAsset` call. */
export async function getTokenMetadata(address: string): Promise<TokenMetadata | null> {
  const addr = normalizeAddress(address);
  if (!addr) return null;
  try {
    const client = getClient();
    const token = { address: addr, abi: erc20Abi } as const;
    const [name, symbol, decimals, totalSupply, owner] = await client.multicall({
      allowFailure: true,
      multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
      contracts: [
        { ...token, functionName: 'name' },
        { ...token, functionName: 'symbol' },
        { ...token, functionName: 'decimals' },
        { ...token, functionName: 'totalSupply' },
        { address: addr, abi: ownableAbi, functionName: 'owner' },
      ],
    });
    if (symbol.status !== 'success' && name.status !== 'success') return null;

    const creator = await getContractCreator(addr);
    return {
      address: addr,
      name: name.status === 'success' ? name.result : '',
      symbol: symbol.status === 'success' ? symbol.result : '',
      decimals: decimals.status === 'success' ? decimals.result : 18,
      totalSupply: totalSupply.status === 'success' ? totalSupply.result.toString() : '0',
      owner: owner.status === 'success' ? owner.result : null,
      creator,
    };
  } catch (error) {
    console.error('[getTokenMetadata] failed:', error);
    return null;
  }
}

// ── Explorer (Blockscout-compatible) ───────────────

export async function explorer<T>(params: Record<string, string>): Promise<T | null> {
  const base = process.env.ELYSIUM_EXPLORER_API;
  if (!base) return null;
  const res = await fetch(`${base}?${new URLSearchParams(params)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return (json?.result ?? null) as T | null;
}

export interface ContractCreation {
  creator: Address | null;
  blockNumber: number | null;
  txHash: string | null;
}

export async function getContractCreation(address: Address): Promise<ContractCreation> {
  try {
    const rows = await explorer<{ contractCreator: string; blockNumber?: string; txHash?: string }[]>({
      module: 'contract',
      action: 'getcontractcreation',
      contractaddresses: address,
    });
    const r = rows?.[0];
    return {
      creator: r?.contractCreator ? normalizeAddress(r.contractCreator) : null,
      blockNumber: r?.blockNumber ? Number(r.blockNumber) : null,
      txHash: r?.txHash ?? null,
    };
  } catch {
    return { creator: null, blockNumber: null, txHash: null };
  }
}

async function getContractCreator(address: Address): Promise<Address | null> {
  return (await getContractCreation(address)).creator;
}

export interface DeployerHistory {
  total_created: number;
  assets: { id: string; name: string; symbol: string }[];
}

/** Contracts created by `deployer`. Replaces the DAS `getAssetsByCreator` call. */
export async function getDeployerHistory(deployer: string): Promise<DeployerHistory | null> {
  const addr = normalizeAddress(deployer);
  if (!addr) return null;
  try {
    const txs = await explorer<{ to: string; contractAddress: string }[]>({
      module: 'account',
      action: 'txlist',
      address: addr,
      sort: 'desc',
    });
    if (!txs) return null;

    const created = txs
      .filter((t) => (!t.to || t.to === '') && t.contractAddress)
      .map((t) => t.contractAddress);
    const top = created.slice(0, 5).map((a) => getAddress(a));

    const client = getClient();
    const calls = top.flatMap((a) => [
      { address: a, abi: erc20Abi, functionName: 'name' } as const,
      { address: a, abi: erc20Abi, functionName: 'symbol' } as const,
    ]);
    const meta = calls.length ? await client.multicall({ allowFailure: true, contracts: calls }) : [];

    return {
      total_created: created.length,
      assets: top.map((id, i) => ({
        id,
        name: meta[i * 2]?.status === 'success' ? String(meta[i * 2].result) : 'Unknown',
        symbol: meta[i * 2 + 1]?.status === 'success' ? String(meta[i * 2 + 1].result) : '',
      })),
    };
  } catch (error) {
    console.error('[getDeployerHistory] failed:', error);
    return null;
  }
}
