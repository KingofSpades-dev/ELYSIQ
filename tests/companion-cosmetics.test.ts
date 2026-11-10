import { assert } from 'chai';
import { validateCosmeticsForTier } from '../src/lib/companion/cosmetics';
import { HybridSoulProvider } from '../src/lib/soul/provider';

describe('ELYSIQ Customizable Companion — Cosmetics & Gating Tests', () => {
  const TEST_WALLET = '7xKp5mzamlm7p0mrqv3ngpopa6hyrv4avpbyq9tiqwg3';

  it('Verifies createDefaultMemory initializes default companion appearance', () => {
    const provider = new HybridSoulProvider();
    const memory = provider.createDefaultMemory(TEST_WALLET);

    assert.isDefined(memory.appearance);
    assert.equal(memory.appearance?.bodyVariant, 'terracotta');
    assert.deepEqual(memory.appearance?.accessories, []);
    assert.equal(memory.appearance?.background, 'default');
    assert.equal(memory.appearance?.defaultMood, 'NEUTRAL');
  });

  it('Validates body variant gating for different tiers', () => {
    // Tier 0 (Free/Guest)
    assert.isTrue(validateCosmeticsForTier({ bodyVariant: 'terracotta', accessories: [], background: 'default' }, 0).valid);
    assert.isTrue(validateCosmeticsForTier({ bodyVariant: 'slate', accessories: [], background: 'default' }, 0).valid);
    assert.isFalse(validateCosmeticsForTier({ bodyVariant: 'ember', accessories: [], background: 'default' }, 0).valid); // Tier 1 required

    // Tier 1 (Bronze)
    assert.isTrue(validateCosmeticsForTier({ bodyVariant: 'ember', accessories: [], background: 'default' }, 1).valid);
    assert.isFalse(validateCosmeticsForTier({ bodyVariant: 'obsidian', accessories: [], background: 'default' }, 1).valid); // Tier 2 required

    // Tier 2 (Gold)
    assert.isTrue(validateCosmeticsForTier({ bodyVariant: 'obsidian', accessories: [], background: 'default' }, 2).valid);
    assert.isFalse(validateCosmeticsForTier({ bodyVariant: 'gold', accessories: [], background: 'default' }, 2).valid); // Tier 3 required

    // Tier 3 (Legendary)
    assert.isTrue(validateCosmeticsForTier({ bodyVariant: 'gold', accessories: [], background: 'default' }, 3).valid);
  });

  it('Validates accessories gating for different tiers', () => {
    // Monocle is Tier 0
    assert.isTrue(validateCosmeticsForTier({ bodyVariant: 'terracotta', accessories: ['glasses_monocle'], background: 'default' }, 0).valid);

    // Leaf Crown (laurel) is Tier 1
    assert.isFalse(validateCosmeticsForTier({ bodyVariant: 'terracotta', accessories: ['crown_laurel'], background: 'default' }, 0).valid);
    assert.isTrue(validateCosmeticsForTier({ bodyVariant: 'terracotta', accessories: ['crown_laurel'], background: 'default' }, 1).valid);

    // Lantern Helmet is Tier 2
    assert.isFalse(validateCosmeticsForTier({ bodyVariant: 'terracotta', accessories: ['helmet_lantern'], background: 'default' }, 1).valid);
    assert.isTrue(validateCosmeticsForTier({ bodyVariant: 'terracotta', accessories: ['helmet_lantern'], background: 'default' }, 2).valid);
  });

  it('Validates background atmosphere gating', () => {
    // Neon studio is Tier 1
    assert.isFalse(validateCosmeticsForTier({ bodyVariant: 'terracotta', accessories: [], background: 'studio_neon' }, 0).valid);
    assert.isTrue(validateCosmeticsForTier({ bodyVariant: 'terracotta', accessories: [], background: 'studio_neon' }, 1).valid);

    // Cyberpunk grid is Tier 2
    assert.isFalse(validateCosmeticsForTier({ bodyVariant: 'terracotta', accessories: [], background: 'cyberpunk' }, 1).valid);
    assert.isTrue(validateCosmeticsForTier({ bodyVariant: 'terracotta', accessories: [], background: 'cyberpunk' }, 2).valid);
  });

  it('Validates voice/personality flavor gating', () => {
    // Dry is Tier 1
    assert.isFalse(validateCosmeticsForTier({ bodyVariant: 'terracotta', accessories: [], background: 'default', personalityFlavor: 'dry' }, 0).valid);
    assert.isTrue(validateCosmeticsForTier({ bodyVariant: 'terracotta', accessories: [], background: 'default', personalityFlavor: 'dry' }, 1).valid);

    // Protective is Tier 2
    assert.isFalse(validateCosmeticsForTier({ bodyVariant: 'terracotta', accessories: [], background: 'default', personalityFlavor: 'protective' }, 1).valid);
    assert.isTrue(validateCosmeticsForTier({ bodyVariant: 'terracotta', accessories: [], background: 'default', personalityFlavor: 'protective' }, 2).valid);
  });
});
