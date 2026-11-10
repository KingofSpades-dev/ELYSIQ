// src/lib/soul/types.ts

export interface CompanionAppearance {
  bodyVariant: string;      // e.g. 'terracotta' (default), 'slate', 'ember', 'obsidian', 'gold'
  accessories: string[];    // e.g. ['hat_fedora', 'glasses_retro', 'scarf_cozy']
  background: string;       // e.g. 'default', 'studio_neon', 'cyberpunk', 'nebula'
  defaultMood: string;      // e.g. 'NEUTRAL', 'ALERT', 'SKEPTICAL', 'SATISFIED', 'THINKING'
  name?: string;
  personalityFlavor?: string; // e.g. 'standard', 'dry', 'protective', 'talkative'
}

export interface UserMemory {
  wallet: string;
  profile: ProfileMemory;
  preferences: PreferenceMemory;
  security: SecurityMemory;
  social: SocialMemory;
  events: MemoryEvent[];
  updatedAt: string;
  appearance?: CompanionAppearance;
}

export interface ProfileMemory {
  role: string;               // e.g., 'Trader', 'NFT Collector', 'Degen'
  summary: string;            // running profile summary regenerated from events
  lastConfirmedAt: string;
}

export interface PreferenceMemory {
  riskTolerance: 'low' | 'medium' | 'high';
  likesMemecoins: boolean;
  customPreferences: Record<string, string>;
}

export interface SecurityMemory {
  rugsAvoided: number;
  riskyProjectsViewed: string[];
  preferredChains: string[];
}

export interface SocialMemory {
  tonePreference: string;
  pastSalutations: string[];
}

export interface MemoryFact {
  text: string;
  confidence: number;         // 0.0 - 1.0 (level of certainty)
  importance: number;         // 0.0 - 1.0 (urgency/significance)
  addedAt: string;
  expiresAt?: string;         // Expiration date for time-sensitive facts
}

export interface MemoryEvent {
  id: string;
  kind: 'SCAN_TOKEN' | 'AVOIDED_RUG' | 'CONNECTED_WALLET' | 'CHAT_SESSION';
  detail: string;
  timestamp: string;
}

export interface SoulProvider {
  load(wallet: string): Promise<UserMemory | null>;
  save(wallet: string, mem: UserMemory): Promise<void>;
  logEvent(wallet: string, event: Omit<MemoryEvent, 'id' | 'timestamp'>): Promise<void>;
}
