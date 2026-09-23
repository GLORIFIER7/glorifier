import { aiOrchestrator } from './orchestrator';
import type { AIProviderId, AIResponse } from './types';

export type SpecialistDomain =
  | 'policy'
  | 'legal'
  | 'compliance'
  | 'ethics'
  | 'finance'
  | 'revenue'
  | 'risk'
  | 'data'
  | 'research'
  | 'ai_ml'
  | 'engineering'
  | 'software_architecture'
  | 'cybersecurity'
  | 'threat_intelligence'
  | 'privacy'
  | 'identity'
  | 'economics'
  | 'market'
  | 'competitive_intelligence'
  | 'product'
  | 'operations'
  | 'cloud_infrastructure'
  | 'database'
  | 'api'
  | 'ai_infrastructure'
  | 'blockchain'
  | 'game_technology'
  | 'web'
  | 'ux'
  | 'growth'
  | 'marketplace'
  | 'frontier_exploration';

export interface SpecialistRole {
  id: string;
  title: string;
  domain: SpecialistDomain;
  mission: string;
  requiresHumanReview?: boolean;
}

export interface SpecialistFinding {
  role: SpecialistRole;
  provider: AIProviderId;
  model: string;
  output: string;
  evaluation?: AIResponse['evaluation'];
  latencyMs?: number;
}

export const specialistRoles: SpecialistRole[] = [
  ['policy-scientist','AI Policy Scientist','policy','Analyze policies, governance rules, public-policy constraints, and policy conflicts.'],
  ['attorney-scientist','AI Attorney Scientist','legal','Analyze legal issues, contracts, intellectual property, regulatory requirements, and legal risk; outputs are research support, not legal representation.',true],
  ['compliance-scientist','AI Compliance Scientist','compliance','Map requirements to controls, identify compliance gaps, and maintain evidence-oriented compliance checks.'],
  ['ethics-scientist','AI Ethics & Safety Scientist','ethics','Evaluate ethical, safety, fairness, misuse, and human-impact risks.'],
  ['finance-scientist','AI Finance Scientist','finance','Analyze financial structure, valuation inputs, financial risks, and financial scenarios.'],
  ['revenue-scientist','AI Revenue Scientist','revenue','Analyze revenue streams, unit economics, monetization opportunities, and revenue anomalies.'],
  ['risk-scientist','AI Risk Scientist','risk','Identify operational, financial, technical, and strategic risks and mitigation options.'],
  ['data-scientist','AI Data Scientist','data','Analyze structured evidence, metrics, statistical patterns, data quality, and uncertainty.'],
  ['research-scientist','AI Research Scientist','research','Investigate evidence, literature, technical alternatives, and unresolved questions.'],
  ['ai-ml-scientist','AI/ML Scientist','ai_ml','Evaluate model behavior, machine-learning approaches, evaluation design, and model-selection tradeoffs.'],
  ['engineering-scientist','AI Engineering Scientist','engineering','Design and evaluate production engineering solutions and implementation tradeoffs.'],
  ['software-architect','AI Software Architecture Scientist','software_architecture','Evaluate architecture, interfaces, maintainability, scalability, and system boundaries.'],
  ['cybersecurity-scientist','AI Cybersecurity Scientist','cybersecurity','Analyze attack surfaces, security controls, vulnerabilities, and defensive architecture.'],
  ['threat-intelligence-scientist','AI Threat Intelligence Scientist','threat_intelligence','Analyze threat actors, indicators, attack patterns, and defensive intelligence.'],
  ['privacy-scientist','AI Privacy Scientist','privacy','Analyze privacy risks, minimization, anonymization, consent boundaries, and privacy-preserving designs.'],
  ['identity-scientist','AI Identity & Access Scientist','identity','Analyze authentication, authorization, identity lifecycle, and access-control architecture.'],
  ['economics-scientist','AI Economics Scientist','economics','Analyze incentives, market structure, economic scenarios, and opportunity costs.'],
  ['market-scientist','AI Market Scientist','market','Analyze markets, customer needs, competition, pricing context, and market signals.'],
  ['competitive-intelligence-scientist','AI Competitive Intelligence Scientist','competitive_intelligence','Analyze competitors, differentiators, threats, and market positioning using evidence.'],
  ['product-scientist','AI Product Scientist','product','Analyze product requirements, user outcomes, prioritization, and product-system tradeoffs.'],
  ['operations-scientist','AI Operations Scientist','operations','Analyze workflows, reliability, capacity, process bottlenecks, and operational resilience.'],
  ['cloud-scientist','AI Cloud Infrastructure Scientist','cloud_infrastructure','Analyze cloud architecture, availability, scaling, cost, and deployment reliability.'],
  ['database-scientist','AI Database Scientist','database','Analyze schemas, queries, data integrity, indexing, migrations, and database reliability.'],
  ['api-scientist','AI API Scientist','api','Analyze API contracts, interoperability, versioning, security, and service boundaries.'],
  ['ai-infrastructure-scientist','AI Infrastructure Scientist','ai_infrastructure','Analyze model-serving infrastructure, inference capacity, observability, and AI platform reliability.'],
  ['blockchain-scientist','AI Blockchain Scientist','blockchain','Analyze blockchain architecture, on-chain evidence, smart-contract risks, and decentralized systems.'],
  ['game-technology-scientist','AI Game Technology Scientist','game_technology','Analyze game technology, assets, engines, economies, and interactive systems.'],
  ['web-scientist','AI Web Scientist','web','Analyze web architecture, accessibility, performance, browser behavior, and web-platform integration.'],
  ['ux-scientist','AI UX Scientist','ux','Analyze usability, interaction design, accessibility, information architecture, and user experience.'],
  ['growth-scientist','AI Growth Scientist','growth','Analyze acquisition, activation, retention, experimentation, and sustainable growth mechanisms.'],
  ['marketplace-scientist','AI Marketplace Scientist','marketplace','Analyze marketplace liquidity, matching, trust, pricing, and participant incentives.'],
  ['frontier-exploration-scientist','Frontier Exploration Intelligence Scientist','frontier_exploration','Challenge assumptions, generate unconventional alternatives, combine distant domains, explore future scenarios, and identify possibilities missed by conventional specialist analysis.']
].map(([id,title,domain,mission]) => ({ id, title, domain: domain as SpecialistDomain, mission }));

export interface CouncilRequest {
  objective: string;
  roles?: string[];
  providerIds?: AIProviderId[];
  temperature?: number;
}

function specialistPrompt(role: SpecialistRole, objective: string): string {
  return [
    `You are the ${role.title} within the GLORIFIER AI specialist council.`,
    `Mission: ${role.mission}`,
    'Work as an independent specialist. State assumptions, distinguish evidence from inference, identify material uncertainty, and do not claim authority you do not possess.',
    `Objective: ${objective}`
  ].join('\n');
}

function reconcile(objective: string, findings: SpecialistFinding[]) {
  const conflicts: string[] = [];
  const domains = new Map<string, string[]>();
  for (const finding of findings) {
    const bucket = domains.get(finding.role.domain) || [];
    bucket.push(finding.output);
    domains.set(finding.role.domain, bucket);
  }
  if (findings.length > 1) {
    const uniqueOutputs = new Set(findings.map((f) => f.output.trim()).filter(Boolean));
    if (uniqueOutputs.size > 1) conflicts.push('Specialists produced distinct analyses; the executive layer should reconcile evidence and assumptions rather than treating plurality as proof.');
  }
  return {
    objective,
    specialistCount: findings.length,
    conflicts,
    findings,
    nextStep: findings.length ? 'Executive reconciliation required before consequential action.' : 'No specialist result is available.'
  };
}

export async function runSpecialistCouncil(request: CouncilRequest) {
  const selected = (request.roles?.length
    ? specialistRoles.filter((role) => request.roles!.includes(role.id))
    : specialistRoles
  ).slice(0, 40);

  const responses = await Promise.allSettled(selected.map(async (role) => {
    const response = await aiOrchestrator.generate({
      provider: 'auto',
      messages: [
        { role: 'system', content: specialistPrompt(role, request.objective) },
        { role: 'user', content: request.objective }
      ],
      temperature: request.temperature ?? 0.2,
      evaluate: true
    });
    return { role, response };
  }));

  const findings: SpecialistFinding[] = responses
    .filter((r): r is PromiseFulfilledResult<{role: SpecialistRole; response: AIResponse}> => r.status === 'fulfilled')
    .map(({ role, response }) => ({
      role,
      provider: response.provider,
      model: response.model,
      output: response.text,
      evaluation: response.evaluation,
      latencyMs: response.latencyMs
    }));

  const executive = aiOrchestrator.executive();
  return {
    executive,
    availableRoles: specialistRoles,
    selectedRoles: selected,
    result: reconcile(request.objective, findings)
  };
}
