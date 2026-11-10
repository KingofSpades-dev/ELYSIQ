// ELYSIQ Intelligence Landing — brand tokens + graph/scan/skill data
import type { GraphNode, GraphEdge, TraceRow, SkillBubble } from './types';

export const ELYSIQ = {
  bone: '#F5F0E8', bone2: '#EDE8DE', bone3: '#E0D9CE',
  ink: '#1A1814', ink2: '#D4633A', ink3: '#8A8880',
  terra: '#D4633A', terra2: '#D4633A', terra3: '#F0A882', terra4: '#FBF0EA',
  green: '#4A7C59', gold: '#C9A84C',
};

export const THREAT_COLORS: Record<string, string> = {
  deployer: '#D4633A',
  liquidity: '#C9A84C',
  behavioral: '#4A7C59',
};

// The reasoning graph (a DAG). x/y normalized to the canvas.
export const GRAPH_NODES: GraphNode[] = [
  { id: 'consult', label: 'CONSULT', x: 0.12, y: 0.5, detail: 'retrieve patterns' },
  { id: 'gather', label: 'GATHER', x: 0.34, y: 0.28, detail: 'Explorer · Dex' },
  { id: 'orchestrate', label: 'ORCHESTRATE', x: 0.56, y: 0.5, detail: 'Opus 4.8 drafts' },
  { id: 'verify', label: 'VERIFY', x: 0.78, y: 0.28, detail: 'separate sub-agent' },
  { id: 'distill', label: 'DISTILL', x: 0.78, y: 0.72, detail: 'new pattern → archive' },
  { id: 'verdict', label: 'VERDICT', x: 0.94, y: 0.5, detail: 'score + reasoning' },
];

export const GRAPH_EDGES: GraphEdge[] = [
  ['consult', 'gather'], ['consult', 'orchestrate'], ['gather', 'orchestrate'],
  ['orchestrate', 'verify'], ['orchestrate', 'distill'], ['verify', 'verdict'], ['distill', 'verdict'],
];

export const GRAPH_ORDER = ['consult', 'gather', 'orchestrate', 'verify', 'distill', 'verdict'];

// Narration per active node (HTML allowed; <span class="tag"> dims the prefix)
export const SCAN_STATUS: Record<string, string> = {
  consult: '<span class="tag">CONSULT ·</span> retrieving 2 learned patterns…',
  gather: '<span class="tag">GATHER ·</span> deployer funded from mixer 18h pre-launch',
  orchestrate: '<span class="tag">ORCHESTRATE ·</span> Opus 4.8 weighing patterns…',
  verify: '<span class="tag">VERIFY ·</span> independent sub-agent: CONFIRM',
  distill: '<span class="tag">DISTILL ·</span> reinforcing mixer-deployer pattern',
  verdict: '<span class="tag">VERDICT ·</span> Trust Score 32 · HIGH · do not buy',
};

export const TRACE_ROWS: TraceRow[] = [
  { label: 'consult', widthPct: 14, duration: '0.12s', color: '#8A8880' },
  { label: 'gather', widthPct: 38, duration: '0.31s', color: '#C9A84C' },
  { label: 'orchestrate', widthPct: 64, duration: '0.52s', color: '#D4633A' },
  { label: 'verify', widthPct: 30, duration: '0.24s', color: '#4A7C59' },
  { label: 'distill', widthPct: 18, duration: '0.15s', color: '#D4633A' },
  { label: 'verdict', widthPct: 8, duration: '0.06s', color: '#F0A882' },
];

// Skill archive (the bubble map). Replace with live data from /api/agent/memory.
export const SKILL_BUBBLES: SkillBubble[] = [
  { name: 'mixer-funded deployer', category: 'deployer', accuracy: 81, fired: 34 },
  { name: 'recycled rug deployer', category: 'deployer', accuracy: 76, fired: 21 },
  { name: 'fresh wallet deployer', category: 'deployer', accuracy: 58, fired: 14 },
  { name: '90s bundler window', category: 'behavioral', accuracy: 88, fired: 30 },
  { name: 'coordinated entry cluster', category: 'behavioral', accuracy: 84, fired: 25 },
  { name: 'wash-trade signature', category: 'behavioral', accuracy: 71, fired: 12 },
  { name: 'sniper concentration', category: 'behavioral', accuracy: 69, fired: 11 },
  { name: 'LP unlock imminent', category: 'liquidity', accuracy: 64, fired: 18 }, // Note: fixed potential double category declaration or typo if any
  { name: 'thin liquidity trap', category: 'liquidity', accuracy: 73, fired: 16 },
  { name: 'mint authority active', category: 'liquidity', accuracy: 91, fired: 40 },
  { name: 'freeze authority active', category: 'liquidity', accuracy: 90, fired: 38 },
  { name: 'single-LP rug setup', category: 'liquidity', accuracy: 67, fired: 9 },
];

// Cluster centers per category (normalized)
export const CLUSTER_CENTERS: Record<string, { x: number; y: number }> = {
  deployer: { x: 0.26, y: 0.42 },
  liquidity: { x: 0.7, y: 0.38 },
  behavioral: { x: 0.48, y: 0.72 },
};
