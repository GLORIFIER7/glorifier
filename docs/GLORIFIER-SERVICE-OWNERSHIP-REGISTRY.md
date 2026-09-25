# GLORIFIER Service Ownership Registry

Every production subsystem should have an accountable owner role and explicit operational contract.

| Service | Owner role | Risk | Critical data | Approval |
|---|---|---|---|---|
| AI CEO | Architecture/Governance | High | decisions, tasks | Yes |
| Permanent Orchestrator | Platform Engineering | High | task state | Yes for consequential actions |
| Provider Registry | AI Infrastructure | Medium | provider metadata | Yes for credential changes |
| Agent Runtime | AI Infrastructure | High | task/artifact metadata | Yes for privileged actions |
| Capability Authorization | Security | Critical | permissions | Yes for elevation |
| Connection Registry | Security/Integrations | Critical | connection metadata | Yes |
| Evidence Engine | Data/Compliance | High | provenance/evidence | No for recording; yes for consequential use |
| Intelligence Index | Data Engineering | Medium | normalized intelligence | No |
| Development/CI Plane | Engineering | High | code/build artifacts | Yes for production |
| Deployment Control | Platform Engineering | Critical | environments | Yes for production |
| Security Engine | Security | Critical | findings/policies | Yes for exceptions |
| Neon Economic Ledger | Finance/Data | Critical | economic truth | Yes for money movement |
| Opportunity Engine | Business Intelligence | High | opportunities/estimates | Yes for binding action |
| Monetization Engine | Revenue Operations | High | offers/contracts/revenue | Yes |
| Payout Control | Finance | Critical | payout requests | Yes; settlement must be externally verified |

Each implementation should expose: owner, backup owner, version, health, SLO, dependencies, data classification, risk, capabilities, runbook reference, and lifecycle status.
