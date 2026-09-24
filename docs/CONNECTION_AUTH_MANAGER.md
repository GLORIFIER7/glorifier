# GLORIFIER Connection Registry + Authentication Manager

The Connection Registry is the common authorization boundary for GLORIFIER integrations and agent tasks.

## Principles
- Human Owner is the final authority.
- Credentials and tokens are never returned by public registry endpoints.
- Store connection metadata, scopes, status, expiry, verification timestamps, and audit events; keep secrets in the deployment secret manager.
- Use least-privilege scopes.
- High/critical risk and configured human-approval connections require approval before an agent task may use them.
- Revoked/expired/disabled connections cannot be used.
- Every authorization, verification, approval request, and important state change should produce an evidence event.
- Core infrastructure remains independent of Google Cloud.

## API
- GET /api/connections — list connection metadata.
- GET /api/connections/:id — inspect one connection.
- POST /api/connections — register/update a connection metadata record.
- POST /api/connections/:id/verify — record a successful verification.
- POST /api/connections/:id/approval — create a human-approval request.

Agent tasks can provide connectionId. If the connection is authorized but requires human approval, the task is returned as awaiting_human_approval instead of executing.

## Authentication standard
OAuth/OIDC integrations should follow current IETF best practices: exact redirect URI matching, authorization-code flow with PKCE, CSRF/mix-up defenses, restricted token privileges, secure token handling, and TLS. See RFC 9700.

## Scope
This registry is not a bypass mechanism. A provider must explicitly authorize GLORIFIER through its supported integration/API, and the relevant account owner must grant permission.