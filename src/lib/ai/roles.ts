export const AI_ROLE_DEFINITIONS = {
  attorney: {
    id: 'attorney',
    name: 'AI Attorney',
    purpose: 'Data policy, privacy, governance, compliance, and risk review.',
    disclaimer: 'Provides compliance-oriented analysis, not legal advice or a lawyer-client relationship.',
  },
  dataScientist: {
    id: 'data-scientist',
    name: 'AI Data Scientist',
    purpose: 'Statistical analysis, data quality, trends, experiments, forecasting, and evidence-based insights.',
    disclaimer: 'Analytical estimates depend on the supplied data and assumptions; they are not guarantees.',
  },
} as const;

export type AIRoleId = keyof typeof AI_ROLE_DEFINITIONS;
