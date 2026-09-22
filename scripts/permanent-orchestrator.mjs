#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process';

const APP_HEALTH_URL = process.env.GLORIFIER_APP_HEALTH_URL || 'https://glorifier-artificial-intelligence-production.up.railway.app/api/health';
const WATCHDOG_MS = Math.max(30_000, Number(process.env.ORCHESTRATOR_WATCHDOG_MS || 60_000));
const IMPROVEMENT_MS = Math.max(5 * 60_000, Number(process.env.ORCHESTRATOR_IMPROVEMENT_MS || 30 * 60_000));
const MAX_FAILURES = Math.max(1, Number(process.env.ORCHESTRATOR_MAX_HEALTH_FAILURES || 3));
let running = false;
let healthFailures = 0;
let stopping = false;

function log(event, details = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...details }));
}

function run(command, args = [], timeoutMs = 25 * 60_000) {
  try {
    const output = execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
      env: process.env,
    });
    return { ok: true, output };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout || ''}\n${error.stderr || error.message}`.trim(),
    };
  }
}

async function healthCheck() {
  try {
    const response = await fetch(APP_HEALTH_URL, { signal: AbortSignal.timeout(15_000) });
    const body = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0, 300)}`);
    healthFailures = 0;
    log('APP_HEALTH_OK', { url: APP_HEALTH_URL });
    return true;
  } catch (error) {
    healthFailures += 1;
    log('APP_HEALTH_FAILED', { failures: healthFailures, error: error instanceof Error ? error.message : String(error) });
    if (healthFailures >= MAX_FAILURES) {
      log('WATCHDOG_RESTART_REQUESTED', { reason: 'application health check failed repeatedly' });
      // Let Railway restart this worker cleanly. The main application remains protected by its own
      // Railway restart policy; this watchdog does not claim to repair infrastructure it cannot access.
      process.exit(1);
    }
    return false;
  }
}

async function autonomousCycle() {
  if (running || stopping) return;
  running = true;
  log('AUTONOMOUS_CYCLE_START');

  try {
    const status = run('git', ['status', '--short']);
    if (!status.ok) throw new Error(status.output);

    if (status.output.trim()) {
      log('DIRTY_WORKTREE', { action: 'skip_cycle' });
      return;
    }

    const agent = run('node', ['scripts/continuous-improvement-agent.mjs']);
    log(agent.ok ? 'AUTONOMOUS_CYCLE_OK' : 'AUTONOMOUS_CYCLE_FAILED', {
      output: agent.output.slice(-8000),
    });

    if (!agent.ok) {
      const healer = run('node', ['scripts/self-healing-agent.mjs']);
      log(healer.ok ? 'SELF_HEAL_OK' : 'SELF_HEAL_FAILED', {
        output: healer.output.slice(-8000),
      });
    }
  } finally {
    running = false;
  }
}

async function main() {
  log('GLORIFIER_PERMANENT_ORCHESTRATOR_START', {
    appHealthUrl: APP_HEALTH_URL,
    watchdogMs: WATCHDOG_MS,
    improvementMs: IMPROVEMENT_MS,
  });

  await healthCheck();
  await autonomousCycle();

  const watchdog = setInterval(() => { void healthCheck(); }, WATCHDOG_MS);
  const improvement = setInterval(() => { void autonomousCycle(); }, IMPROVEMENT_MS);

  const shutdown = (signal) => {
    if (stopping) return;
    stopping = true;
    clearInterval(watchdog);
    clearInterval(improvement);
    log('ORCHESTRATOR_SHUTDOWN', { signal });
    setTimeout(() => process.exit(0), 100);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  log('ORCHESTRATOR_FATAL', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
