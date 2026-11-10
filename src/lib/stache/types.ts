// Shared types for The Stache Protocol

export interface StacheProject {
  project: string;
  status: 'Certified' | 'Pending' | 'Revoked';
  trustScore: number | null;
  date: string;
  certifiedBy: string;
  contractAddress: string;
  mascotUrl?: string;
  stachePassMint?: string; // cNFT mint address once minted
}

export interface StacheApplication {
  projectName: string;
  twitterHandle: string;
  contractAddress: string;
  mascotImageUrl: string;
  contactEmail?: string;
}

export interface ScanResult {
  trustScore: number;
  riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  contractChecked: boolean;
  deployerVerified: boolean;
  bundlersFlagged: number;
  findings: string[];
  passed: boolean;
}

export interface RevenueSplit {
  treasury: number;   // 80
  projects: number;   // 10
  stakers: number;    // 10
}
