import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { aiOrchestrator } from './src/lib/ai/orchestrator';
import { checkPostgres } from './src/lib/db/postgres';
import { runAIRole } from './src/lib/ai/roles-service';
import { AI_ROLE_DEFINITIONS } from './src/lib/ai/roles';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function now() {
  return new Date().toISOString();
}

// Public operational endpoints.
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: now(),
    database: 'postgresql',
  });
});

app.get('/api/health/database', async (_req, res) => {
  const result = await checkPostgres();
  res.status(result.ok ? 200 : 503).json(result);
});

app.get('/api/ai/roles', (_req, res) => {
  res.json({ roles: Object.values(AI_ROLE_DEFINITIONS) });
});

app.post('/api/ai/role', async (req, res) => {
  try {
    const { role, task, context, provider } = req.body;
    if (role !== 'attorney' && role !== 'dataScientist') {
      return res.status(400).json({ error: 'role must be attorney or dataScientist' });
    }
    if (!task || typeof task !== 'string') {
      return res.status(400).json({ error: 'task is required' });
    }
    const result = await runAIRole(role, task, context ?? {}, provider);
    return res.json({
      role,
      output: result.text,
      modelUsed: result.model,
      provider: result.provider,
      disclaimer: AI_ROLE_DEFINITIONS[role].disclaimer,
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'AI role analysis failed',
    });
  }
});

app.get('/api/ai/providers', (_req, res) => {
  res.json({ providers: aiOrchestrator.registry() });
});

app.get('/api/ai/metrics', (_req, res) => {
  res.json({
    providers: aiOrchestrator.metrics(),
    generatedAt: new Date().toISOString(),
    note: 'Cost values are estimates based on optional per-1K-token environment rates; latency and reliability are measured by this server process.',
  });
});

app.post('/api/ai/orchestrate', async (req, res) => {
  try {
    const { messages, provider = 'auto', model, temperature, maxTokens } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }
    const result = await aiOrchestrator.generate({
      messages,
      provider,
      model,
      temperature,
      maxTokens,
    });
    return res.json(result);
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'AI orchestration failed',
    });
  }
});

app.post('/api/ai/collaborate', async (req, res) => {
  try {
    const { messages, providerIds } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }
    const responses = await aiOrchestrator.collaborate(messages, providerIds);
    return res.json({ responses });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'AI collaboration failed',
    });
  }
});

// Unified council: real connected providers only; no fabricated model output.
app.post('/api/ai/council', async (req, res) => {
  try {
    const { agenda, currentPolicy, footprints, activeModels } = req.body;
    const topic = String(agenda || 'Glorifier AI governance review');
    const policy = currentPolicy || {};
    const requestedProviders = Array.isArray(activeModels)
      ? activeModels.filter((id: unknown) => ['openai', 'gemini', 'meta'].includes(String(id)))
      : undefined;

    const providerIds = requestedProviders?.length ? requestedProviders : undefined;
    const messages = [
      {
        role: 'system' as const,
        content:
          'You are a specialist member of the Glorifier AI governance council. ' +
          'Analyze the agenda using only the supplied facts. Clearly distinguish evidence, assumptions, and recommendations. ' +
          'Do not claim legal authority, cryptographic guarantees, or model agreement unless actually established.',
      },
      {
        role: 'user' as const,
        content: JSON.stringify({
          agenda: topic,
          policy,
          footprints: Array.isArray(footprints) ? footprints : [],
        }),
      },
    ];

    const responses = await aiOrchestrator.collaborate(messages, providerIds);
    const participants = responses.map((result) => ({
      modelId: result.provider,
      name: result.model,
      provider: result.provider,
      role: 'Independent governance analysis',
      color: 'emerald',
      badge: 'Live Provider',
      status: 'completed' as const,
      output: result.text,
      perspective: 'Independent analysis from a connected provider',
      keyRecommendation: 'Review this provider output alongside the other live results before changing policy.',
    }));

    const successful = responses.length;
    const configured = aiOrchestrator.registry().filter((p) => p.status === 'connected').length;
    const coverage = configured > 0 ? Math.round((successful / configured) * 100) : 0;

    return res.json({
      agenda: topic,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      participants,
      unifiedConsensus:
        successful > 0
          ? `Live multi-provider review completed with ${successful} successful provider response(s). This is a review record, not proof of unanimous agreement; policy changes remain subject to the user's explicit action.`
          : 'No connected AI provider returned a result. No policy change was proposed.',
      consensusScore: coverage,
      recommendedEpsilon: Number(policy.globalEpsilon ?? 0.35),
      recommendedFloorUsd: Number(policy.minimumMonthlyFloorUsd ?? 35),
      actionDirectives: [
        'Review each live provider output and its supporting assumptions.',
        'Keep the current privacy epsilon unless the evidence supports a change.',
        'Keep the current compensation floor unless market evidence supports a change.',
        'Require explicit user approval before applying governance changes.',
      ],
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'AI council failed',
    });
  }
});

app.post('/api/ai/broker-chat', async (req, res) => {
  try {
    const { message, currentPolicy, footprintsSummary, model } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const result = await aiOrchestrator.generate({
      provider: model && ['openai', 'gemini', 'meta'].includes(model) ? model : 'auto',
      model: typeof model === 'string' ? model : undefined,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You are the Glorifier AI governance assistant. Provide practical, evidence-based analysis of data governance, privacy, and compensation workflows. ' +
            'Do not invent market prices, legal rights, successful actions, cryptographic proofs, or completed external operations. ' +
            'State uncertainty when facts are unavailable. ' +
            `Current policy: ${JSON.stringify(currentPolicy || {})}. Data summary: ${String(footprintsSummary || 'not provided')}.`,
        },
        { role: 'user', content: message },
      ],
    });

    return res.json({
      reply: result.text,
      modelUsed: result.model,
      provider: result.provider,
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'AI broker chat failed',
    });
  }
});

app.post('/api/ai/evaluate-offer', async (req, res) => {
  try {
    const { offer, userPolicy, model } = req.body;
    if (!offer || typeof offer !== 'object') {
      return res.status(400).json({ error: 'offer is required' });
    }

    const result = await aiOrchestrator.generate({
      provider: model && ['openai', 'gemini', 'meta'].includes(model) ? model : 'auto',
      model: typeof model === 'string' ? model : undefined,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Evaluate the supplied data acquisition offer. Return JSON only with score (0-100), verdict (RECOMMEND|CAUTION|REJECT), reasoning, and optional suggestedCounterUsd. ' +
            'Do not invent facts about the buyer. Base the analysis only on supplied fields.',
        },
        {
          role: 'user',
          content: JSON.stringify({ offer, userPolicy }),
        },
      ],
    });

    const parsed = parseJson(result.text);
    if (parsed && typeof parsed === 'object') {
      return res.json({
        ...(parsed as Record<string, unknown>),
        modelUsed: result.model,
        provider: result.provider,
      });
    }
    return res.json({
      reasoning: result.text,
      modelUsed: result.model,
      provider: result.provider,
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Offer evaluation failed',
    });
  }
});

app.post('/api/ai/audit-footprint', async (req, res) => {
  try {
    const { category, sourceName, sampleData, model } = req.body;
    const result = await aiOrchestrator.generate({
      provider: model && ['openai', 'gemini', 'meta'].includes(model) ? model : 'auto',
      model: typeof model === 'string' ? model : undefined,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Perform a privacy engineering review of the supplied data sample. Return JSON only with reidentificationRisk, recommendedEpsilon, kAnonymityMin, fairMarketMonthlyUsd, and sanitizationReport. ' +
            'Treat numerical estimates as estimates, not measured facts.',
        },
        {
          role: 'user',
          content: JSON.stringify({ category, sourceName, sampleData }),
        },
      ],
    });

    const parsed = parseJson(result.text);
    if (parsed && typeof parsed === 'object') {
      return res.json({
        ...(parsed as Record<string, unknown>),
        modelUsed: result.model,
        provider: result.provider,
      });
    }
    return res.json({
      sanitizationReport: result.text,
      modelUsed: result.model,
      provider: result.provider,
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Footprint audit failed',
    });
  }
});

app.post('/api/ai/generate-clawback', async (req, res) => {
  try {
    const { brokerName, complianceStatute, recordCount, model } = req.body;
    const result = await aiOrchestrator.generate({
      provider: model && ['openai', 'gemini', 'meta'].includes(model) ? model : 'auto',
      model: typeof model === 'string' ? model : undefined,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            'Draft a privacy/data-deletion request based only on the supplied facts. Return JSON with documentTitle and legalNotice. ' +
            'Do not state that the request is legally binding or guarantee statutory penalties. Encourage verification of the applicable law before sending.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            brokerName,
            complianceStatute,
            recordCount,
          }),
        },
      ],
    });

    const parsed = parseJson(result.text);
    if (parsed && typeof parsed === 'object') {
      return res.json({
        ...(parsed as Record<string, unknown>),
        modelUsed: result.model,
        provider: result.provider,
      });
    }
    return res.json({
      documentTitle: 'Privacy / Data Deletion Request',
      legalNotice: result.text,
      modelUsed: result.model,
      provider: result.provider,
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Clawback generation failed',
    });
  }
});

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Glorifier AI server listening on 0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});
