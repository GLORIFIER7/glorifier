# GLORIFIER Agent-to-Agent Runtime

GLORIFIER is an AI-to-AI application first. The browser is an optional observability client, not the system of record.

## Runtime
- Agent discovery: `GET /api/agents`
- Submit task: `POST /api/agents/tasks`
- Task status: `GET /api/agents/tasks/:id`
- Protocol manifest: `GET /.well-known/glorifier-agent.json`

## Protocol
GLORIFIER-A2A-v1 uses task-oriented JSON over HTTP. It is intentionally compatible with the same conceptual model used by modern agent interoperability protocols: capability discovery, delegation, task lifecycle, artifacts, and explicit authorization boundaries. A2A is an open protocol for agent collaboration, while MCP focuses on agent-to-tool/context integration. citeturn0search0turn0search9

## Design
AI CEO -> delegates -> GPT/Gemini/specialists -> evidence/artifact -> synthesis -> human approval boundary.

No agent may autonomously merge code, deploy production, expose secrets, or make financial/legal commitments.
