export type GuardLevel = 'safe' | 'caution' | 'danger';

export interface GameCertification {
  mintAddress: string;
  gameName: string;
  certified: boolean;
  tier: 'NONE' | 'BRONZE' | 'GOLD' | 'LEGENDARY';
  trustScore: number;
  scanVerdict: string;
  findings: string[];
}

export interface PlayerPerks {
  xp_boost_pct: number;
  marketplace_fee_discount_pct: number;
  verified_seller: boolean;
  priority_support: boolean;
}

export interface PlayerCredentials {
  walletAddress: string;
  stachePassTier: 'NONE' | 'BRONZE' | 'GOLD' | 'LEGENDARY';
  perks: PlayerPerks;
}

export interface GuardianState {
  level: GuardLevel;
  expression: 'NEUTRAL' | 'THINKING' | 'FOCUSED' | 'SATISFIED' | 'SKEPTICAL' | 'ALERT' | 'SCANNING' | 'THREAT' | 'ON_GUARD';
  message: string;
}

export interface UnifiedSessionResponse {
  game: GameCertification;
  player: PlayerCredentials;
  guardian: GuardianState;
}

export interface GuardCheckResponse {
  target: string;
  kind: 'wallet' | 'token';
  level: GuardLevel;
  findings: string[];
  guardian: GuardianState;
}
