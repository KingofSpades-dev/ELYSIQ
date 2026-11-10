// ELYSIQ Intelligence Landing — shared types

export interface GraphNode {
  id: string;
  label: string;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  detail: string;
}

export type GraphEdge = [string, string];

export interface ScanStep {
  id: string;
  status: string; // narration shown while this node is active
}

export interface TraceRow {
  label: string;
  widthPct: number;
  duration: string;
  color: string;
}

export type ThreatCategory = 'deployer' | 'liquidity' | 'behavioral';

export interface SkillBubble {
  name: string;
  category: ThreatCategory;
  accuracy: number; // 0..100
  fired: number;    // times this pattern has fired
}

// Live data shape from GET /api/agent/memory (when wired to the real agent)
export interface MemoryStats {
  total_scans: number;
  skills_learned: number;
  accuracy: number;
  recent_skills: SkillBubble[];
}
