import { PlayerPerks } from './types';

export const PERKS_BY_TIER: Record<'NONE' | 'BRONZE' | 'GOLD' | 'LEGENDARY', PlayerPerks> = {
  NONE: {
    xp_boost_pct: 0,
    marketplace_fee_discount_pct: 0,
    verified_seller: false,
    priority_support: false,
  },
  BRONZE: {
    xp_boost_pct: 5,
    marketplace_fee_discount_pct: 10,
    verified_seller: false,
    priority_support: false,
  },
  GOLD: {
    xp_boost_pct: 15,
    marketplace_fee_discount_pct: 25,
    verified_seller: true,
    priority_support: false,
  },
  LEGENDARY: {
    xp_boost_pct: 30,
    marketplace_fee_discount_pct: 50,
    verified_seller: true,
    priority_support: true,
  },
};

export function getPerksForTier(tier: 'NONE' | 'BRONZE' | 'GOLD' | 'LEGENDARY'): PlayerPerks {
  return PERKS_BY_TIER[tier] || PERKS_BY_TIER.NONE;
}
