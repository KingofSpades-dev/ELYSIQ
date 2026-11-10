export interface CosmeticItem {
  id: string;
  name: string;
  tier: 0 | 1 | 2 | 3;
  type: 'color' | 'accessory' | 'background' | 'flavor';
  value: string;
  socket?: 'head' | 'face' | 'neck';
}

export const COSMETIC_COLORS: Record<string, CosmeticItem> = {
  terracotta: { id: 'terracotta', name: 'Terracotta', tier: 0, type: 'color', value: '#D4633A' },
  slate: { id: 'slate', name: 'Slate', tier: 0, type: 'color', value: '#4A607A' },
  ember: { id: 'ember', name: 'Ember', tier: 1, type: 'color', value: '#A33E2B' },
  obsidian: { id: 'obsidian', name: 'Obsidian', tier: 2, type: 'color', value: '#2B2B2B' },
  gold: { id: 'gold', name: 'Gold', tier: 3, type: 'color', value: '#D4AF37' }
};

export const COSMETIC_ACCESSORIES: Record<string, CosmeticItem> = {
  none: { id: 'none', name: 'None', tier: 0, type: 'accessory', value: 'none' },
  glasses_monocle: { id: 'glasses_monocle', name: 'Golden Monocle', tier: 0, type: 'accessory', value: 'monocle', socket: 'face' },
  hat_top_hat: { id: 'hat_top_hat', name: 'Top Hat', tier: 0, type: 'accessory', value: 'top_hat', socket: 'head' },
  crown_laurel: { id: 'crown_laurel', name: 'Leaf Crown (Laurel)', tier: 1, type: 'accessory', value: 'laurel', socket: 'head' },
  golden_wreath: { id: 'golden_wreath', name: 'Golden Cube Wreath', tier: 1, type: 'accessory', value: 'golden_cube_wreath', socket: 'neck' },
  helmet_lantern: { id: 'helmet_lantern', name: 'Lantern Helmet', tier: 2, type: 'accessory', value: 'lantern_helmet', socket: 'head' },
  weapon_hammer: { id: 'weapon_hammer', name: 'Voxel Hammer', tier: 2, type: 'accessory', value: 'hammer', socket: 'neck' },
  crown_royal: { id: 'crown_royal', name: 'Royal Crown', tier: 3, type: 'accessory', value: 'royal_crown', socket: 'head' },
  weapon_sword: { id: 'weapon_sword', name: 'Voxel Sword', tier: 3, type: 'accessory', value: 'sword', socket: 'neck' }
};

export const COSMETIC_BACKGROUNDS: Record<string, CosmeticItem> = {
  default: { id: 'default', name: 'Classic Studio', tier: 0, type: 'background', value: '#F5F0E8' },
  studio_neon: { id: 'studio_neon', name: 'Neon Studio', tier: 1, type: 'background', value: '#12131D' },
  cyberpunk: { id: 'cyberpunk', name: 'Cyberpunk Grid', tier: 2, type: 'background', value: '#0B1020' },
  legendary: { id: 'legendary', name: 'Legendary Sovereign', tier: 3, type: 'background', value: '#24160A' }
};

export const COSMETIC_FLAVORS: Record<string, CosmeticItem> = {
  standard: { id: 'standard', name: 'Standard (Nietzschean)', tier: 0, type: 'flavor', value: 'standard' },
  dry: { id: 'dry', name: 'Dry / Laconic', tier: 1, type: 'flavor', value: 'dry' },
  protective: { id: 'protective', name: 'Protective Guardian', tier: 2, type: 'flavor', value: 'protective' },
  talkative: { id: 'talkative', name: 'Talkative Analyst', tier: 2, type: 'flavor', value: 'talkative' }
};

/**
 * Validates whether a user configuration complies with their hold-to-access tier.
 */
export function validateCosmeticsForTier(
  appearance: {
    bodyVariant: string;
    accessories: string[];
    background: string;
    personalityFlavor?: string;
  },
  tier: 0 | 1 | 2 | 3
): { valid: boolean; reason?: string } {
  // Check body color
  const color = COSMETIC_COLORS[appearance.bodyVariant];
  if (!color) {
    return { valid: false, reason: `Invalid body variant: ${appearance.bodyVariant}` };
  }
  if (color.tier > tier) {
    return { valid: false, reason: `${color.name} body requires Tier ${color.tier} (current tier: ${tier})` };
  }

  // Check accessories
  for (const accId of appearance.accessories) {
    const acc = COSMETIC_ACCESSORIES[accId];
    if (!acc) {
      return { valid: false, reason: `Invalid accessory: ${accId}` };
    }
    if (acc.tier > tier) {
      return { valid: false, reason: `${acc.name} accessory requires Tier ${acc.tier} (current tier: ${tier})` };
    }
  }

  // Check background
  const bg = COSMETIC_BACKGROUNDS[appearance.background];
  if (!bg) {
    return { valid: false, reason: `Invalid background: ${appearance.background}` };
  }
  if (bg.tier > tier) {
    return { valid: false, reason: `${bg.name} background requires Tier ${bg.tier} (current tier: ${tier})` };
  }

  // Check personality flavor
  if (appearance.personalityFlavor) {
    const flavor = COSMETIC_FLAVORS[appearance.personalityFlavor];
    if (!flavor) {
      return { valid: false, reason: `Invalid personality flavor: ${appearance.personalityFlavor}` };
    }
    if (flavor.tier > tier) {
      return { valid: false, reason: `${flavor.name} voice flavor requires Tier ${flavor.tier} (current tier: ${tier})` };
    }
  }

  return { valid: true };
}
