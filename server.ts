import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { aiOrchestrator } from './src/lib/ai/orchestrator';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '10mb' }));

let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAIClient;
}

// Provider-independent AI control plane
app.get('/api/ai/providers', (_req: Request, res: Response) => {
  res.json({ providers: aiOrchestrator.registry() });
});

app.post('/api/ai/orchestrate', async (req: Request, res: Response) => {
  try {
    const { messages, provider = 'auto', model, temperature, maxTokens } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }
    const result = await aiOrchestrator.generate({ messages, provider, model, temperature, maxTokens });
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'AI orchestration failed' });
  }
});

app.post('/api/ai/collaborate', async (req: Request, res: Response) => {
  try {
    const { messages, providers } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }
    const results = await aiOrchestrator.collaborate(messages, providers);
    return res.json({ results });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'AI collaboration failed' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Existing broker chat, now using the orchestrator when available.
app.post('/api/ai/broker-chat', async (req: Request, res: Response) => {
  try {
    const { message, currentPolicy, footprintsSummary } = req.body;
    const systemPrompt = `You are DataSovereign AI, an expert autonomous personal data broker and privacy agent representing the user.
Respond directly, concisely (2-4 paragraphs max), strategically, and authoritatively.
User's current policy: Floor = $${currentPolicy?.minimumMonthlyFloorUsd || 35}/mo; Mode = ${currentPolicy?.brokerMode || 'balanced'}; Epsilon ε = ${currentPolicy?.globalEpsilon || 0.35}; AI pretraining allowed: ${currentPolicy?.allowAiModelPretraining ? 'YES' : 'NO'}.
Data streams summary: ${footprintsSummary || 'Browsing, E-Commerce, Developer, Health telemetry active'}.`;

    const result = await aiOrchestrator.generate({
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
      provider: 'auto',
      temperature: 0.4,
    });

    let suggestedAction: { label: string; type: string } | undefined;
    const lower = String(message || '').toLowerCase();
    if (lower.includes('clawback') || lower.includes('delete') || lower.includes('broker')) {
      suggestedAction = { label: 'Dispatch Statutory Erasure Notices', type: 'opt_out_all' };
    } else if (lower.includes('earn') || lower.includes('more') || lower.includes('maximize') || lower.includes('yield')) {
      suggestedAction = { label: 'Optimize Yield Curve', type: 'maximize_yield' };
    } else if (lower.includes('privacy') || lower.includes('shield') || lower.includes('strict')) {
      suggestedAction = { label: 'Tighten Differential Privacy', type: 'apply_policy' };
    }
    return res.json({ reply: result.text, suggestedAction, provider: result.provider, model: result.model });
  } catch (error) {
    console.error('AI Broker Chat error:', error);
    const ai = getGenAI();
    if (!ai) {
      return res.json({
        reply: '[Broker Local Engine]: No connected AI provider is configured. Add a provider key in the server environment.',
        suggestedAction: { label: 'Configure an AI Provider', type: 'configure_provider' }
      });
    }
    return res.status(502).json({ error: 'AI Broker Chat failed' });
  }
});

app.post('/api/ai/evaluate-offer', async (req: Request, res: Response) => {
  try {
    const { offer, userPolicy } = req.body;
    const result = await aiOrchestrator.generate({
      messages: [{
        role: 'user',
        content: `Evaluate this data purchase offer. Return JSON with score (0-100), verdict (RECOMMEND|CAUTION|REJECT), reasoning, and optional suggestedCounterUsd.
Buyer: ${offer.buyerName} (${offer.buyerCategory})
Data: ${offer.dataCategoriesNeeded?.join(', ')}
Compensation: $${offer.offeredCompUsd} ${offer.pricingCadence}
Retention: ${offer.retentionWindowDays} days
Epsilon: ${offer.maxEpsilonAllowed}
Purpose: ${offer.purposeSummary}
User floor: $${userPolicy?.minimumMonthlyFloorUsd}; epsilon: ${userPolicy?.globalEpsilon}`
      }],
      provider: 'auto',
      temperature: 0.2,
    });
    try {
      return res.json(JSON.parse(result.text));
    } catch {
      return res.json({ reasoning: result.text, provider: result.provider, model: result.model });
    }
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Evaluation failed' });
  }
});

app.post('/api/ai/audit-footprint', async (req: Request, res: Response) => {
  try {
    const { category, sourceName, sampleData } = req.body;
    const result = await aiOrchestrator.generate({
      messages: [{
        role: 'user',
        content: `Perform a privacy leakage audit. Source: ${sourceName} (${category}). Sample records: ${JSON.stringify(sampleData)}. Return JSON with reidentificationRisk, recommendedEpsilon, kAnonymityMin, fairMarketMonthlyUsd, and sanitizationReport.`
      }],
      provider: 'auto',
      temperature: 0.2,
    });
    try {
      return res.json(JSON.parse(result.text));
    } catch {
      return res.json({ sanitizationReport: result.text, provider: result.provider, model: result.model });
    }
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Audit failed' });
  }
});

app.post('/api/ai/generate-clawback', async (req: Request, res: Response) => {
  try {
    const { brokerName, complianceStatute, recordCount } = req.body;
    const result = await aiOrchestrator.generate({
      messages: [{
        role: 'user',
        content: `Draft a data deletion/accounting request for ${brokerName}. Mention applicable statute(s): ${complianceStatute || 'user-supplied applicable law'}. Estimated records: ${recordCount || 400}. Clearly state that this is a generated draft requiring legal review before sending. Return JSON with documentTitle and legalNotice.`
      }],
      provider: 'auto',
      temperature: 0.3,
    });
    try {
      return res.json(JSON.parse(result.text));
    } catch {
      return res.json({ documentTitle: 'Generated Data Rights Notice', legalNotice: result.text });
    }
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Notice generation failed' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Orchestrator running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
