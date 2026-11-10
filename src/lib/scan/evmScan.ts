import Anthropic from '@anthropic-ai/sdk';
import { erc20Abi, getAddress, parseAbi, toFunctionSelector, type Address, type Hex } from 'viem';
import {
  explorer,
  getClient,
  getContractCreation,
  getDeployerHistory,
  getTokenMetadata,
  type DeployerHistory,
  type TokenMetadata,
} from '@/lib/chain/elysium';
import { getKnownToken, type KnownToken } from '@/lib/chain/knownTokens';

// ── Facts (computed by code, never by the model) ───────────────────────────

const DEAD = '0x000000000000000000000000000000000000dead';
const ZERO = '0x0000000000000000000000000000000000000000';
const EIP1967_IMPL = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const EIP1967_BEACON = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';
const beaconAbi = parseAbi(['function implementation() view returns (address)', 'function owner() view returns (address)']);
const EIP1967_ADMIN = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';

/** Function signatures whose presence in runtime bytecode matters for a token's risk. */
const CAPABILITY_SIGNATURES: Record<string, string[]> = {
  mint: ['mint(address,uint256)', 'mint(uint256)', 'mint()', 'mint(address)', '_mint(address,uint256)'],
  pause: ['pause()', 'unpause()'],
  blacklist: [
    'blacklist(address)', 'addToBlacklist(address)', 'addBlackList(address)', 'blockAddress(address)',
    'setBlacklist(address,bool)', 'blacklistAddress(address,bool)', 'setBlacklisted(address,bool)', 'isBlacklisted(address)',
  ],
  fee_setter: [
    'setTax(uint256)', 'setFee(uint256)', 'setFees(uint256,uint256)', 'setBuyFee(uint256)', 'setSellFee(uint256)',
    'updateFees(uint256,uint256)', 'setBuyTax(uint256)', 'setSellTax(uint256)', 'setTaxFee(uint256)',
  ],
  trading_switch: ['setTradingEnabled(bool)', 'enableTrading()', 'openTrading()', 'setTrading(bool)', 'disableTrading()'],
  limits: ['setMaxTxAmount(uint256)', 'setMaxWallet(uint256)', 'setMaxWalletAmount(uint256)', 'setLimits(uint256,uint256)'],
  upgrade: ['upgradeTo(address)', 'upgradeToAndCall(address,bytes)'],
  role_based_access: ['grantRole(bytes32,address)', 'hasRole(bytes32,address)'],
};

const SELECTORS: Record<string, string[]> = Object.fromEntries(
  Object.entries(CAPABILITY_SIGNATURES).map(([cap, sigs]) => [cap, sigs.map((s) => toFunctionSelector(s).slice(2))]),
);

export interface HolderInfo {
  address: string;
  pct: number;
  is_contract: boolean;
}

export interface TokenFacts {
  address: Address;
  known: KnownToken | null;
  metadata: TokenMetadata;
  is_proxy: boolean;
  proxy_kind: 'eip1967' | 'beacon' | null;
  implementation: Address | null;
  proxy_admin: Address | null;
  owner: { address: string | null; renounced: boolean | null; is_contract: boolean };
  capabilities: Record<string, boolean>;
  verified_source: { verified: boolean; contract_name: string | null };
  holders: { top: HolderInfo[]; top1_pct: number; top5_pct: number; top5_non_contract_pct: number } | null;
  market: {
    priceUsd: number | null;
    marketCap: number;
    liquidityUsd: number;
    volume24h: number;
    pairs: number;
    dexes: string[];
    oldestPairAt: number | null;
  } | null;
  age_days: number | null;
  deployer: { address: string | null; contracts_created: number | null; recent: DeployerHistory['assets'] };
}

async function proxySlot(address: Address, slot: Hex): Promise<Address | null> {
  try {
    const raw = await getClient().getStorageAt({ address, slot });
    if (!raw) return null;
    const addr = '0x' + raw.slice(-40);
    return addr.toLowerCase() === ZERO ? null : getAddress(addr);
  } catch {
    return null;
  }
}

function detectCapabilities(code: string): Record<string, boolean> {
  const lower = code.toLowerCase();
  const out: Record<string, boolean> = {};
  for (const [cap, sels] of Object.entries(SELECTORS)) {
    // Dispatcher tables load selectors with PUSH4 (0x63).
    out[cap] = sels.some((sel) => lower.includes('63' + sel));
  }
  return out;
}

async function isContractAddress(address: string): Promise<boolean> {
  try {
    const code = await getClient().getCode({ address: address as Address });
    return !!code && code !== '0x';
  } catch {
    return false;
  }
}

async function fetchHolders(token: Address, totalSupply: bigint): Promise<TokenFacts['holders']> {
  if (totalSupply === BigInt(0)) return null;
  try {
    const rows = await explorer<{ TokenHolderAddress: string; TokenHolderQuantity: string }[]>({
      module: 'token', action: 'tokenholderlist', contractaddress: token, page: '1', offset: '10',
    });
    if (!rows || !Array.isArray(rows) || rows.length === 0) return null;
    const top: HolderInfo[] = [];
    for (const r of rows.slice(0, 10)) {
      const qty = BigInt(r.TokenHolderQuantity || '0');
      const pct = Number((qty * BigInt(10000)) / totalSupply) / 100;
      const addr = r.TokenHolderAddress.toLowerCase();
      if (addr === DEAD || addr === ZERO) continue; // burned supply is not concentration risk
      top.push({ address: r.TokenHolderAddress, pct, is_contract: await isContractAddress(r.TokenHolderAddress) });
    }
    const top5 = top.slice(0, 5);
    return {
      top,
      top1_pct: top[0]?.pct ?? 0,
      top5_pct: top5.reduce((a, h) => a + h.pct, 0),
      top5_non_contract_pct: top5.filter((h) => !h.is_contract).reduce((a, h) => a + h.pct, 0),
    };
  } catch {
    return null;
  }
}

async function fetchVerifiedSource(token: Address): Promise<TokenFacts['verified_source']> {
  try {
    const rows = await explorer<{ SourceCode?: string; ContractName?: string }[]>({
      module: 'contract', action: 'getsourcecode', address: token,
    });
    const r = Array.isArray(rows) ? rows[0] : null;
    return { verified: !!r?.SourceCode, contract_name: r?.ContractName || null };
  } catch {
    return { verified: false, contract_name: null };
  }
}

async function fetchMarket(token: Address): Promise<TokenFacts['market']> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const data = await res.json();
    const pairs = ((data.pairs as any[]) || []).filter((p) => p.chainId === 'elysium');
    if (pairs.length === 0) return null;
    pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    const top = pairs[0];
    return {
      priceUsd: top.priceUsd ? Number(top.priceUsd) : null,
      marketCap: top.marketCap || top.fdv || 0,
      liquidityUsd: pairs.reduce((a, p) => a + (p.liquidity?.usd || 0), 0),
      volume24h: pairs.reduce((a, p) => a + (p.volume?.h24 || 0), 0),
      pairs: pairs.length,
      dexes: Array.from(new Set(pairs.map((p) => String(p.dexId)))),
      oldestPairAt: Math.min(...pairs.map((p) => p.pairCreatedAt || Date.now())),
    };
  } catch {
    return null;
  }
}

export class NotATokenError extends Error {}

export async function gatherFacts(address: Address): Promise<TokenFacts> {
  const client = getClient();
  const code = await client.getCode({ address });
  if (!code || code === '0x') throw new NotATokenError('Address is not a contract on Elysium');

  const metadata = await getTokenMetadata(address);
  if (!metadata) throw new NotATokenError('Contract does not look like an ERC-20 token');

  let implementation = await proxySlot(address, EIP1967_IMPL);
  let proxyAdmin = await proxySlot(address, EIP1967_ADMIN);
  let proxyKind: TokenFacts['proxy_kind'] = implementation ? 'eip1967' : null;
  if (!implementation) {
    // Beacon proxies (the Arbitrum bridge's standard token layout): logic lives behind a beacon.
    const beacon = await proxySlot(address, EIP1967_BEACON);
    if (beacon) {
      try {
        implementation = await client.readContract({ address: beacon, abi: beaconAbi, functionName: 'implementation' });
        proxyKind = 'beacon';
        // Whoever owns the beacon can upgrade every token behind it.
        const beaconOwner = await client.readContract({ address: beacon, abi: beaconAbi, functionName: 'owner' }).catch(() => null);
        if (beaconOwner && beaconOwner.toLowerCase() !== ZERO) proxyAdmin = beaconOwner;
      } catch { /* leave as non-proxy */ }
    }
  }
  const logicCode = implementation ? ((await client.getCode({ address: implementation })) ?? code) : code;
  const capabilities = detectCapabilities(logicCode);

  const ownerAddr = metadata.owner ? metadata.owner.toLowerCase() : null;
  const renounced = ownerAddr === null ? null : ownerAddr === ZERO || ownerAddr === DEAD;

  const [creation, verified, holders, market] = await Promise.all([
    getContractCreation(address),
    fetchVerifiedSource(address),
    fetchHolders(address, BigInt(metadata.totalSupply)),
    fetchMarket(address),
  ]);

  let ageDays: number | null = null;
  if (creation.blockNumber) {
    try {
      const block = await client.getBlock({ blockNumber: BigInt(creation.blockNumber) });
      ageDays = Math.max(0, Math.floor((Date.now() / 1000 - Number(block.timestamp)) / 86400));
    } catch { /* leave null */ }
  }

  const deployerHistory = metadata.creator ? await getDeployerHistory(metadata.creator) : null;

  return {
    address,
    known: getKnownToken(address),
    metadata,
    is_proxy: !!implementation,
    proxy_kind: proxyKind,
    implementation,
    proxy_admin: proxyAdmin,
    owner: {
      address: metadata.owner,
      renounced,
      is_contract: metadata.owner && ownerAddr !== ZERO && ownerAddr !== DEAD ? await isContractAddress(metadata.owner) : false,
    },
    capabilities,
    verified_source: verified,
    holders,
    market,
    age_days: ageDays,
    deployer: {
      address: metadata.creator,
      contracts_created: deployerHistory?.total_created ?? null,
      recent: deployerHistory?.assets ?? [],
    },
  };
}

// ── Deterministic fields ───────────────────────────────────────────────────

type Authority = 'revoked' | 'active' | 'unknown';

/** Can someone still mint? (owner / admin / role holder) */
export function mintAuthority(f: TokenFacts): Authority {
  if (f.known) return 'unknown'; // controlled by the canonical bridge gateway, see findings
  if (f.is_proxy && f.proxy_admin) return 'active'; // admin can swap the logic
  if (!f.capabilities.mint) return 'revoked';
  if (f.owner.renounced === false) return 'active';
  if (f.owner.renounced === true) return f.capabilities.role_based_access ? 'unknown' : 'revoked';
  return 'unknown';
}

/** Can someone still freeze / pause / blacklist / tax? */
export function freezeAuthority(f: TokenFacts): Authority {
  if (f.known) return 'unknown';
  if (f.is_proxy && f.proxy_admin) return 'active';
  const risky = f.capabilities.pause || f.capabilities.blacklist || f.capabilities.fee_setter || f.capabilities.trading_switch;
  if (!risky) return 'revoked';
  if (f.owner.renounced === false) return 'active';
  if (f.owner.renounced === true) return f.capabilities.role_based_access ? 'unknown' : 'revoked';
  return 'unknown';
}

function holderConcentration(f: TokenFacts): string {
  if (!f.holders) return 'Holder data unavailable';
  return `Top 5 hold ${f.holders.top5_pct.toFixed(1)}% (${f.holders.top5_non_contract_pct.toFixed(1)}% in wallets, rest in contracts)`;
}

function clusterRisk(f: TokenFacts): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (!f.holders) return 'MEDIUM';
  const w = f.holders.top5_non_contract_pct;
  if (w >= 50) return 'HIGH';
  if (w >= 20) return 'MEDIUM';
  return 'LOW';
}

export function riskLevelFor(score: number): 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'RUG_RISK' {
  if (score >= 90) return 'SAFE';
  if (score >= 80) return 'LOW';
  if (score >= 50) return 'MEDIUM';
  if (score >= 25) return 'HIGH';
  return 'RUG_RISK';
}

/** Hard ceilings the model cannot talk its way past. Returns [maxScore, reason] pairs that apply. */
export function scoreCaps(f: TokenFacts): [number, string][] {
  if (f.known) return [];
  const caps: [number, string][] = [];
  if (mintAuthority(f) === 'active') caps.push([49, 'Mint capability is still controlled (owner, role or upgrade admin)']);
  if (freezeAuthority(f) === 'active') caps.push([59, 'Owner/admin can still pause, blacklist, tax or gate trading']);
  if (!f.verified_source.verified) caps.push([69, 'Contract source is not verified on the explorer']);
  if (f.holders && f.holders.top5_non_contract_pct >= 50) caps.push([49, `Top 5 wallets hold ${f.holders.top5_non_contract_pct.toFixed(0)}% of supply`]);
  if (!f.market || f.market.liquidityUsd < 5000) caps.push([69, 'No meaningful DEX liquidity found on Elysium']);
  return caps;
}

// ── Model synthesis ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are ELYSIQ's token security analyst for Elysium, an EVM Layer 2 (Arbitrum Orbit) for Hyperliquid. Tokens are ERC-20 contracts and gas is HYPE.
You receive FACTS that were computed from the chain, the block explorer and DexScreener. Treat them as ground truth. Never invent facts, addresses or numbers that are not in FACTS.

Return ONLY raw JSON (no markdown, no backticks):
{
  "reasoning": "Step-by-step analysis of the facts and what they mean for a trader. Write this FIRST.",
  "trust_score": number (0-100, holistic judgment),
  "verdict": "one clear sentence: what should a trader do?",
  "findings": ["specific risk finding grounded in FACTS", "..."],
  "green_flags": ["specific positive grounded in FACTS", "..."]
}

How to read FACTS:
- "known" non-null means the exact address is a canonical token listed in Kinetiq's Elysium docs. It is NOT an impersonator. Judge it by its note (bridge and peg risk), never call it a scam, and never compare it to addresses on other chains.
- capabilities.* are function selectors found in the runtime bytecode (of the implementation when behind a proxy). They show what the code CAN do, not that it will.
- owner.renounced: true means ownership is burned; false means an owner can still call privileged functions; null means no owner() function.
- is_proxy with proxy_admin means the logic can be replaced at any time (proxy_kind "beacon": the admin is the beacon owner, who can upgrade every token behind that beacon).
- holders: addresses flagged is_contract are often LP pools, bridges or vaults, so weigh wallet concentration (top5_non_contract_pct) most.
- market null means no DEX pair was found on Elysium. Unknown is not safe: say so.
- LP locking could not be verified; do not claim LP is locked or unlocked.
- Be conservative. When uncertain, score lower. Protect the user.`;

let _anthropic: Anthropic | null = null;
function anthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
      defaultHeaders: {
        'api-key': process.env.ANTHROPIC_API_KEY!,
        Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY!}`,
      },
    });
  }
  return _anthropic;
}

export interface ScanOutput {
  name: string;
  symbol: string;
  marketCap: number;
  result: Record<string, any>;
  facts: TokenFacts;
}

export async function runEvmScan(address: Address): Promise<ScanOutput> {
  const facts = await gatherFacts(address);

  const response = await anthropicClient().messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `FACTS:\n${JSON.stringify(facts, null, 2)}` }],
  });
  const raw = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  let model: any;
  try {
    model = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    throw new Error('Analysis synthesis parsing failed');
  }

  // Enforce the rules in code: the model proposes, the facts dispose.
  let score = typeof model.trust_score === 'number' ? Math.max(0, Math.min(100, Math.round(model.trust_score))) : 0;
  const findings: string[] = Array.isArray(model.findings) ? [...model.findings] : [];
  const greenFlags: string[] = Array.isArray(model.green_flags) ? [...model.green_flags] : [];

  const caps = scoreCaps(facts);
  for (const [max, reason] of caps) {
    if (score > max) {
      score = max;
      if (!findings.some((f) => f.includes(reason))) findings.push(`${reason} (score capped at ${max})`);
    }
  }
  if (facts.known) {
    score = Math.max(score, 85);
    findings.push(`Canonical token: ${facts.known.note}`);
  }

  const marketCap = facts.market?.marketCap || 0;
  const result = {
    reasoning: model.reasoning || '',
    trust_score: score,
    risk_level: riskLevelFor(score),
    verdict: model.verdict || '',
    mint_authority: mintAuthority(facts),
    freeze_authority: freezeAuthority(facts),
    lp_locked: null as boolean | null,
    top_holder_concentration: holderConcentration(facts),
    bundler_risk: clusterRisk(facts),
    findings,
    green_flags: greenFlags,
    market_cap: marketCap,
  };

  return {
    name: facts.metadata.name.replace(/\u0000/g, '').trim() || 'Unknown Token',
    symbol: facts.metadata.symbol.replace(/\u0000/g, '').trim(),
    marketCap,
    result,
    facts,
  };
}
