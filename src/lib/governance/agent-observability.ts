export interface AgentTraceEvent {
  traceId: string; agentId: string; event: string; provider?: string; tool?: string;
  latencyMs?: number; costUsd?: number; status: 'started' | 'completed' | 'failed' | 'denied';
  createdAt: string; metadata?: Record<string, unknown>;
}
const events: AgentTraceEvent[] = [];
export function recordAgentTrace(event: Omit<AgentTraceEvent, 'createdAt'>) {
  const value = { ...event, createdAt: new Date().toISOString() }; events.push(value);
  if (events.length > 5000) events.splice(0, events.length - 5000); return value;
}
export function getAgentObservabilitySnapshot() {
  return { totalEvents: events.length, failedEvents: events.filter(e => e.status === 'failed').length,
    deniedEvents: events.filter(e => e.status === 'denied').length, recent: events.slice(-100) };
}
