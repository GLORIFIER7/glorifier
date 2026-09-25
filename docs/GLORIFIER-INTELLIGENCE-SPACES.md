# GLORIFIER Intelligence Spaces

An Intelligence Space is a bounded context package for an agent task.

## Context sources

- Repository/code and issue context
- Agent/task history
- Business objectives and customer context
- Evidence and provenance records
- Policies and authorization state
- Connection metadata (never raw secrets)
- Runtime telemetry and health
- Economic truth and ledger references
- External source references

## Context contract

Every space should identify: purpose, tenant/resource scope, source references, freshness, classification, allowed capabilities, exclusions, and evidence requirements.

Spaces are context containers, not authorization grants. A document appearing in context does not give an agent permission to act on it.
