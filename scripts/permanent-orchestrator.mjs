#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const APP_HEALTH_URL = process.env.GLORIFIER_APP_HEALTH_URL || 'https://glorifier-artificial-intelligence-production.up.railway.app/api/health';
const SPECIALIST_COUNCIL_URL = process.env.GLORIFIER_SPECIALIST_COUNCIL_URL || APP_HEALTH_URL.replace(/\/api\/health$/, '/api/ai/specialist-council');
const WORK_TOGETHER_GPT_URL = process.env.GLORIFIER_WORK_TOGETHER_GPT_URL || APP_HEALTH_URL.replace(/\/api\/health$/, '/api/ai/work-together-gpt');
const WATCHDOG_MS = Math.max(30_000, Number(process.env.ORCHESTRATOR_WATCHDOG_MS || 60_000));
const IMPROVEMENT_MS = Math.max(5 * 60_000, Number(process.env.ORCHESTRATOR_IMPROVEMENT_MS || 30 * 60_000));
const MAX_FAILURES = Math.max(1, Number(process.env.ORCHESTRATOR_MAX_HEALTH_FAILURES || 3));
const REVENUE_MILESTONE_VERIFIED = process.env.GLORIFIER_REVENUE_MILESTONE_VERIFIED === 'true';
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
      process.exit(1);
    }
    return false;
  }
}

async function standingSpecialistMission() {
  if (REVENUE_MILESTONE_VERIFIED) {
    log('STANDING_REVENUE_MISSION_COMPLETE', {
      reason: 'verified milestone flag is enabled',
      targetUsd: 1_000_000,
    });
    return;
  }

  try {
    const response = await fetch(SPECIALIST_COUNCIL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        objective: 'Continuously identify, validate, prioritize, measure, and improve lawful opportunities that can generate real settled revenue for GLORIFIER. Review product, market, growth, revenue, finance, risk, legal, compliance, cybersecurity, data, engineering, operations, and frontier opportunities. Focus on evidence, conversion paths, customer value, unit economics, bottlenecks, and the next highest-leverage authorized action.',
        standingMission: true,
        temperature: 0.2
      }),
      signal: AbortSignal.timeout(10 * 60_000),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0, 1000)}`);
    log('STANDING_SPECIALIST_MISSION_OK', {
      targetUsd: 1_000_000,
      successCondition: 'verified settled funds received in an authorized bank/payment account',
      response: body.slice(-4000),
    });
  } catch (error) {
    log('STANDING_SPECIALIST_MISSION_FAILED', {
      error: error instanceof Error ? error.message : String(error),
      action: 'continue_next_cycle',
    });
  }
}

async function standingGptCoWorkingMission() {
  try {
    const response = await fetch(WORK_TOGETHER_GPT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        taskPrompt: '24/7 Standing Continuous Pair-Engineering & Sovereign Yield Optimization: Audit system circuit breakers, differential privacy epsilon consumption, and commercial dataset licensing floors.',
        domain: 'code_engineering',
        standingMission: true
      }),
      signal: AbortSignal.timeout(10 * 60_000),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0, 1000)}`);
    log('STANDING_GPT_COWORKING_OK', {
      mission: '24/7 continuous pairing with GPT-4o & Gemini',
      response: body.slice(-2000),
    });
  } catch (error) {
    log('STANDING_GPT_COWORKING_FAILED', {
      error: error instanceof Error ? error.message : String(error),
      action: 'continue_next_cycle',
    });
  }
}

async function autonomousCycle() {
  if (running || stopping) return;
  running = true;
  log('AUTONOMOUS_CYCLE_START');

  try {
    const status = run('git', ['status', '--short']);
    if (!status.ok) {
      log('GIT_METADATA_UNAVAILABLE', {
        action: 'continue_cycle',
        reason: status.output.slice(-1000),
      });
    } else if (status.output.trim()) {
      log('DIRTY_WORKTREE', { action: 'skip_cycle' });
      return;
    }

    await standingGptCoWorkingMission();
    await standingSpecialistMission();

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
    specialistCouncilUrl: SPECIALIST_COUNCIL_URL,
    watchdogMs: WATCHDOG_MS,
    improvementMs: IMPROVEMENT_MS,
    standingRevenueMission: true,
    standing247GptCoWorking: true,
    workTogetherGptUrl: WORK_TOGETHER_GPT_URL,
    revenueTargetUsd: 1_000_000,
    milestoneVerified: REVENUE_MILESTONE_VERIFIED,
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
