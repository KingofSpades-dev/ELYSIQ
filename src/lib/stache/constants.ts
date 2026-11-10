// The Stache Protocol — shared constants

export const ELYSIQ_COLORS = {
  bone: '#F5F0E8',
  bone2: '#EDE8DE',
  bone3: '#E0D9CE',
  ink: '#1A1814',
  ink2: '#D4633A',
  ink3: '#8A8880',
  terra: '#D4633A',
  terra2: '#D4633A',
  terra3: '#F0A882',
  terra4: '#FBF0EA',
} as const;

export const REVENUE_SPLIT = {
  treasury: 80,
  projects: 10,
  stakers: 10,
} as const;

export const STACHE_PASS_BENEFITS = [
  'NFT on Elysium',
  'Proof of audit & security verification',
  'Access to ELYSIQ Wallet Analyzer',
  'Priority support & recovery services',
  'Discounted deep scans',
] as const;

// The official ELYSIQ stache path — reuse everywhere for consistency
export const STACHE_SVG_PATH =
  'M60 40 C46 22, 28 22, 12 32 C4 36, 0 44, 8 48 C20 44, 32 40, 42 48 C50 54, 56 48, 60 44 C64 48, 70 54, 78 48 C88 40, 100 44, 112 48 C120 44, 116 36, 108 32 C92 22, 74 22, 60 40 Z';
