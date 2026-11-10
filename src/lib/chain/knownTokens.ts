/**
 * Tokens that Kinetiq's Elysium documentation lists as canonical deployments on mainnet
 * (https://elysium.kinetiq.xyz/docs/contract-addresses, token bridging pages).
 * Matching is by exact address only. Look-alike tokens with the same symbol must NOT match.
 */
export interface KnownToken {
  label: string;
  kind: 'bridged-canonical' | 'wrapped-native' | 'protocol';
  note: string;
}

const KNOWN: Record<string, KnownToken> = {
  '0xb47c4c8f73f009cc0c0d3f92b388d13e293f0b65': {
    label: 'USDC (bridged from HyperEVM)',
    kind: 'bridged-canonical',
    note: 'Representation minted 1:1 by the canonical HyperEVM to Elysium bridge gateway; backed by escrow on HyperEVM (0xb88339CB7199b77E23DB6E890353E22632Ba630f). Risks are bridge and peg risk, not a rug by a deployer.',
  },
  '0xe45a355d9e9cad2ad85f2d03e3ee3102a036acf0': {
    label: 'KNTQ (bridged from HyperEVM)',
    kind: 'bridged-canonical',
    note: 'Representation minted 1:1 by the canonical bridge gateway; origin token on HyperEVM is 0x000000000000780555bD0BCA3791f89f9542c2d6.',
  },
  '0xba876237b0f021a6c6d852d6c26e107997cc5e81': {
    label: 'WHYPE (wrapped HYPE)',
    kind: 'wrapped-native',
    note: 'Wrapped native gas token of Elysium, deployed through the canonical WHYPE gateway.',
  },
};

export function getKnownToken(address: string): KnownToken | null {
  return KNOWN[address.toLowerCase()] ?? null;
}
