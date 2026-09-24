# GLORIFIER AWS Infrastructure Intelligence — GAWS-1.0

## Purpose

GLORIFIER treats AWS as an evidence-producing infrastructure and commercial intelligence source, not as an unrestricted automation target.

The integration is refined around the AWS Well-Architected Framework's six pillars: operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability.

It also adds account/organization inventory, resource intelligence, IAM/security intelligence, observability, cost/FinOps evidence, AWS Marketplace intelligence, and Revenue Control Plane linkage.

## Architecture

Human Authority → AI CEO → Policy / Compliance / Security / Finance / Infrastructure Scientists → AWS Intelligence → Evidence → Revenue Control Plane → Governed Action → Human Approval

## Capabilities

- AWS organizations and accounts
- Regions and resource inventory
- Compute, containers, serverless, storage, databases and networking
- IAM and security posture observations
- Reliability and operational findings
- Performance efficiency
- Cloud costs and cost trends
- Sustainability observations
- AWS Marketplace products, pricing and metering signals
- infrastructure-to-business value relationships
- evidence-backed optimization opportunities

## Refinements

### Infrastructure-to-economics graph
Resources can be connected to products, tenants, GWU usage, estimated costs, customer ROI and commercial opportunities.

### Cost/revenue separation
AWS spend, estimated savings and marketplace usage never enter verified revenue automatically.

### Evidence-first architecture
Important AWS observations can carry source references and evidence status.

### Continuous Well-Architected improvement
The six AWS pillars become recurring GLORIFIER assessment dimensions rather than a one-time checklist.

### Commercial intelligence
AWS Marketplace supports subscription, contract and contract-plus-usage models. GLORIFIER maps those concepts into its pricing, metering, contracts, invoices and payment-evidence architecture without treating AWS billing as GLORIFIER revenue.

### Human-governed automation
Read/inventory intelligence is the default. Resource deletion, IAM privilege changes, billing changes, provisioning and financial movement remain disabled for autonomous execution.

## Economic truth

- AWS resource value ≠ revenue
- AWS cost ≠ revenue
- estimated savings ≠ revenue
- Marketplace listing ≠ revenue
- Marketplace usage ≠ revenue
- contract value ≠ cash
- invoice ≠ payment
- missing evidence ≠ zero
- verified revenue requires qualifying payment evidence and an external reference

## Connection

conn-aws is registered in the GLORIFIER Connection Registry.

Credentials are not stored in the connection registry and secrets are not returned to clients.

The initial integration is intentionally read/evidence-first.

## Future connector expansion

When an authorized AWS connector becomes available, the system can populate this intelligence layer from live AWS APIs while preserving the same governance and economic-truth rules.
