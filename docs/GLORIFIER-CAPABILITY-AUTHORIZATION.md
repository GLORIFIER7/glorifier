# GLORIFIER Capability Authorization Model

## Rule

**Capability grants are narrower than credentials.** An agent may receive a capability to perform a bounded operation without receiving unrestricted access to the underlying provider.

## Evaluation

request → identity → capability → resource scope → risk → policy → connection status → human gate → execution → evidence

## Default risk gates

- low: bounded read/analysis; approval normally not required.
- medium: external service interaction or material change; approval depends on resource policy.
- high: production, security, legal, financial, or privileged changes; human approval required.
- critical: money movement, credential changes, ownership changes, destructive operations; explicit human approval required.

## Deny by default

Unknown capabilities, revoked connections, expired authorization, missing required evidence, and out-of-scope resources are denied.

## Separation

Planning and recommendation may be autonomous. Execution authority is independently evaluated.
