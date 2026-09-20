import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { aiOrchestrator } from './src/lib/ai/orchestrator';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/ai/providers', (_req: Request, res: Response) => {
  res.json({ providers: aiOrchestrator.registry() });
});

app.post('/api/ai/orchestrate', async (req: Request, res: Response) => {
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

app.post('/api/ai/collaborate', async (req: Request, res: Response) => {
  try {
    const { messages, providers } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }

    const results = await aiOrchestrator.collaborate(messages, providers);
    return res.json({ results });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'AI collaboration failed',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Orchestrator running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
