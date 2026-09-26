export type EvidenceNodeType = 'observation' | 'opportunity' | 'analysis' | 'decision' | 'authorization' | 'action' | 'external-result' | 'evidence' | 'verification' | 'economic-outcome';
export interface EvidenceNode { id: string; type: EvidenceNodeType; ref?: string; payload: Record<string, unknown>; createdAt: string; }
export interface EvidenceEdge { from: string; to: string; relation: string; }
const nodes = new Map<string, EvidenceNode>(); const edges: EvidenceEdge[] = [];
export function addEvidenceNode(type: EvidenceNodeType, payload: Record<string, unknown>, ref?: string) {
  const node = { id: 'ev-' + crypto.randomUUID(), type, payload, ref, createdAt: new Date().toISOString() };
  nodes.set(node.id, node); return node;
}
export function linkEvidence(from: string, to: string, relation: string) {
  if (!nodes.has(from) || !nodes.has(to)) throw new Error('Both evidence nodes must exist before linking.');
  const edge = { from, to, relation }; edges.push(edge); return edge;
}
export function getEvidenceGraph() { return { nodes: Array.from(nodes.values()), edges: [...edges] }; }
