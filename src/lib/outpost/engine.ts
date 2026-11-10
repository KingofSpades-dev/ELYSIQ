import { OutpostPlot, OutpostPlayer } from './types';

export const SCANNER_TIERS = [
  { name: 'BASIC', dur: 8000, yield: 30, cost: 20 },
  { name: 'PRO', dur: 14000, yield: 80, cost: 50 },
  { name: 'ELITE', dur: 22000, yield: 180, cost: 110 }
];

export function getPlotUnlockCost(currentUnlockedCount: number): number {
  // Prototype starts at 1000 and multiplies by 2.0 for each new plot
  let cost = 1000;
  for (let i = 3; i < currentUnlockedCount; i++) {
    cost = Math.floor(cost * 2.0);
  }
  return cost;
}

export function deployScanner(
  plots: OutpostPlot[],
  plotIndex: number,
  player: OutpostPlayer,
  guildBonus: number // e.g. 1.15
): { success: boolean; error?: string; updatedPlot?: OutpostPlot; cost?: number } {
  const plot = plots.find(p => p.plotIndex === plotIndex);
  if (!plot) return { success: false, error: 'Plot not found' };
  if (plot.state !== 'EMPTY') return { success: false, error: 'Plot is not empty' };

  // Deploy the highest scanner level player has unlocked and can afford
  let tier = Math.min(player.scannerLevel - 1, 2);
  while (tier > 0 && player.cred < SCANNER_TIERS[tier].cost) {
    tier--;
  }

  const selectedTier = SCANNER_TIERS[tier];
  if (player.cred < selectedTier.cost) {
    return { success: false, error: `Need at least ${selectedTier.cost} CRED to deploy` };
  }

  const updatedPlot: OutpostPlot = {
    ...plot,
    state: 'WORKING',
    scannerTier: tier,
    startedAt: Date.now(),
    duration: selectedTier.dur,
    expectedYield: Math.floor(selectedTier.yield * player.harvestMultiplier * guildBonus)
  };

  return {
    success: true,
    updatedPlot,
    cost: selectedTier.cost
  };
}

export function harvestScanner(
  plots: OutpostPlot[],
  plotIndex: number
): { success: boolean; error?: string; updatedPlot?: OutpostPlot; intelReward?: number; repReward?: number } {
  const plot = plots.find(p => p.plotIndex === plotIndex);
  if (!plot) return { success: false, error: 'Plot not found' };
  if (plot.state === 'LOCKED' as any) return { success: false, error: 'Plot is locked' };
  if (plot.state === 'EMPTY') return { success: false, error: 'Plot is empty' };

  const elapsed = Date.now() - plot.startedAt;
  if (elapsed < plot.duration) {
    return { success: false, error: `Still scanning... ${Math.ceil((plot.duration - elapsed) / 1000)}s left` };
  }

  const updatedPlot: OutpostPlot = {
    ...plot,
    state: 'EMPTY',
    scannerTier: 0,
    startedAt: 0,
    duration: 0,
    expectedYield: 0
  };

  const intelReward = plot.expectedYield;
  const repReward = Math.floor(plot.expectedYield / 3);

  return {
    success: true,
    updatedPlot,
    intelReward,
    repReward
  };
}

export function unlockPlot(
  plots: OutpostPlot[],
  plotIndex: number,
  player: OutpostPlayer
): { success: boolean; error?: string; updatedPlot?: OutpostPlot; cost?: number } {
  const plot = plots.find(p => p.plotIndex === plotIndex);
  if (!plot) return { success: false, error: 'Plot not found' };
  if (plot.state !== 'LOCKED' as any) return { success: false, error: 'Plot is already unlocked' };

  const currentUnlocked = plots.filter(p => p.state !== ('LOCKED' as any)).length;
  const cost = getPlotUnlockCost(currentUnlocked);

  if (player.cred < cost) {
    return { success: false, error: `Need ${cost} CRED to unlock plot` };
  }

  const updatedPlot: OutpostPlot = {
    ...plot,
    state: 'EMPTY'
  };

  return {
    success: true,
    updatedPlot,
    cost
  };
}
