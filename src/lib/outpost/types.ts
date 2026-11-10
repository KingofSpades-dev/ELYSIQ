export interface OutpostPlayer {
  walletAddress: string;
  rep: number;
  intel: number;
  cred: number;
  scannerLevel: number; // 1 = Basic, 2 = Pro, 3 = Elite
  harvestMultiplier: number;
  guildId: number | null;
  createdAt: string;
  lastSeen: string;
  boost5Count?: number;
  boost15Count?: number;
  boost25Count?: number;
}

export type PlotState = 'EMPTY' | 'WORKING' | 'READY';

export interface OutpostPlot {
  id: string; // e.g. walletAddress_index
  walletAddress: string;
  plotIndex: number; // 0 to 7
  state: PlotState;
  scannerTier: number; // 0 = Basic, 1 = Pro, 2 = Elite
  startedAt: number; // timestamp ms
  duration: number; // ms
  expectedYield: number;
}

export interface OutpostGuild {
  id: number;
  name: string;
  pooledIntel: number;
  bonusMultiplier: number;
  members: string[]; // wallet addresses
}

export interface OutpostHunt {
  id: string;
  ticker: string;
  signals: {
    k: string;
    v: string;
    cls: 'good' | 'bad' | 'warn';
    rug: number;
  }[];
  isRug: boolean;
  marketCap: string;
  spawnedAt: number; // timestamp ms
  deadline: number; // timestamp ms
  winnerWallet: string | null;
  othersCount: number;
}

export interface OutpostHuntCall {
  huntId: string;
  wallet: string;
  choice: boolean; // true = safe, false = rug
  calledAt: number; // timestamp ms
  correct: boolean;
}
