import { assert } from 'chai';
import { deployScanner, harvestScanner, unlockPlot, SCANNER_TIERS, getPlotUnlockCost } from '../src/lib/outpost/engine';
import { checkRateLimit, validateActionIntent } from '../src/lib/outpost/anti_cheat';
import { OutpostPlayer, OutpostPlot } from '../src/lib/outpost/types';

describe('ELYSIQ Outpost — Core Game Engine Tests', () => {
  let player: OutpostPlayer;
  let plots: OutpostPlot[];

  beforeEach(() => {
    player = {
      walletAddress: 'test_wallet_address_123',
      rep: 0,
      intel: 0,
      cred: 120, // starts with 120 CRED
      scannerLevel: 1, // BASIC
      harvestMultiplier: 1.0,
      guildId: null,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };

    plots = Array.from({ length: 8 }, (_, i) => ({
      id: `test_wallet_address_123_${i}`,
      walletAddress: 'test_wallet_address_123',
      plotIndex: i,
      state: i < 3 ? 'EMPTY' : ('LOCKED' as any),
      scannerTier: 0,
      startedAt: 0,
      duration: 0,
      expectedYield: 0
    }));
  });

  it('Calculates plot unlock cost curve correctly', () => {
    // 3 plots unlocked initially. The 4th plot (index 3) should cost 80
    assert.equal(getPlotUnlockCost(3), 80);
    // 5th plot unlocked (index 4) should cost 80 * 2.0 = 160
    assert.equal(getPlotUnlockCost(4), 160);
  });

  it('Deploys basic scanner successfully on empty plot', () => {
    const res = deployScanner(plots, 0, player, 1.0);
    assert.isTrue(res.success, 'Deployment should succeed');
    assert.equal(res.cost, 20, 'Basic scanner cost should be 20 CRED');
    assert.equal(res.updatedPlot?.state, 'WORKING', 'Plot state should change to WORKING');
    assert.equal(res.updatedPlot?.scannerTier, 0, 'Scanner tier should be 0 (Basic)');
  });

  it('Fails to deploy scanner if player lacks credits', () => {
    player.cred = 10; // set below basic scanner cost (20)
    const res = deployScanner(plots, 0, player, 1.0);
    assert.isFalse(res.success, 'Deployment should fail');
    assert.include(res.error, 'Need at least 20 CRED');
  });

  it('Harvests ready scanner and calculates yields correctly', async () => {
    const deployRes = deployScanner(plots, 0, player, 1.15); // with 15% guild bonus
    assert.isTrue(deployRes.success);
    
    // Simulate scanner working and finished
    const workingPlot = deployRes.updatedPlot!;
    workingPlot.startedAt = Date.now() - 9000; // 9 seconds ago (duration is 8s)

    const updatedPlots = [workingPlot, ...plots.slice(1)];
    const harvestRes = harvestScanner(updatedPlots, 0);

    assert.isTrue(harvestRes.success, 'Harvest should succeed');
    assert.equal(harvestRes.intelReward, Math.floor(30 * 1.15), 'Yield should match expected basic scanner with guild bonus');
    assert.equal(harvestRes.updatedPlot?.state, 'EMPTY', 'Plot should return to EMPTY');
  });

  it('Fails to harvest scanner before duration timer elapses', () => {
    const deployRes = deployScanner(plots, 0, player, 1.0);
    assert.isTrue(deployRes.success);
    
    const workingPlot = deployRes.updatedPlot!;
    workingPlot.startedAt = Date.now(); // just deployed

    const updatedPlots = [workingPlot, ...plots.slice(1)];
    const harvestRes = harvestScanner(updatedPlots, 0);

    assert.isFalse(harvestRes.success, 'Harvest should fail');
    assert.include(harvestRes.error, 'Still scanning');
  });

  it('Unlocks locked plot locations successfully', () => {
    // Unlock plot index 3 (first locked plot)
    const res = unlockPlot(plots, 3, player);
    assert.isTrue(res.success, 'Unlocking should succeed');
    assert.equal(res.cost, 80, 'Unlock cost should be 80 CRED');
    assert.equal(res.updatedPlot?.state, 'EMPTY', 'Unlocked plot state should be EMPTY');
  });

  it('Enforces player action click rate limiting', async () => {
    const firstCall = checkRateLimit('test_player', 100);
    const immediateCall = checkRateLimit('test_player', 100);
    
    assert.isTrue(firstCall, 'First action should pass');
    assert.isFalse(immediateCall, 'Subsequent action within interval should be blocked');

    // Wait for timeout
    await new Promise((resolve) => setTimeout(resolve, 150));
    const finalCall = checkRateLimit('test_player', 100);
    assert.isTrue(finalCall, 'Action after timeout should pass');
  });

  it('Detects replay attack attempts', () => {
    const processedIds = new Set<string>();
    const uniqueIntent = validateActionIntent('intent_hash_1', processedIds);
    const duplicateIntent = validateActionIntent('intent_hash_1', processedIds);

    assert.isTrue(uniqueIntent, 'Unique action intent should be accepted');
    assert.isFalse(duplicateIntent, 'Duplicate action intent should be blocked as replay');
  });
});
