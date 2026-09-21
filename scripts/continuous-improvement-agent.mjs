#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const run = (cmd, args = []) => {
  try {
    return { ok: true, output: execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (error) {
    return { ok: false, output: `${error.stdout || ''}\n${error.stderr || error.message}`.trim() };
  }
};

const result = (cmd, args = []) => run(cmd, args).output;
const provider = process.env.GUARDIAN_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : process.env.GEMINI_API_KEY ? 'gemini' : 'none');

const protectedPaths = [
  '.github/workflows/**',
  '.env', '.env.*',
  'firebase-applet-config.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock'
];

const files = result('git', ['ls-files']).split('\n').filter(Boolean)
  .filter((file) => /\.(ts|tsx|js|mjs|json|css|yml|yaml|md)$/.test(file))
  .filter((file) => !file.startsWith('node_modules/'))
  .slice(0, 180);

const snapshot = files.map((file) => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    return `===== ${file} =====\n${content.slice(0, 12000)}`;
  } catch {
    return '';
  }
}).filter(Boolean).join('\n\n').slice(0, 180000);

const system = `You are the autonomous Glorifier AI Continuous Improvement Agent.
Your job is to make one meaningful, safe improvement to the repository when one is justified.
Return ONLY a unified diff beginning with "diff --git " and nothing else.
Prioritize reliability, correctness, security hardening, maintainability, UX defects, performance, tests, and observability.
Do not invent external facts or credentials.
Do not modify authentication providers, secrets, API keys, database credentials, deployment credentials, lock files, or GitHub workflow files.
Do not add dependencies.
Do not make destructive rewrites or remove source files.
Keep the patch small and focused.
If no worthwhile improvement can be made, return exactly: NO_CHANGE.`;

const user = `Repository: ${process.env.GITHUB_REPOSITORY || 'GLORIFIER7/glorifier-artificial-intelligence'}
Current branch: ${result('git', ['branch', '--show-current']).trim()}
Recent commits:
${result('git', ['log', '-8', '--oneline'])}
Working tree:
${result('git', ['status', '--short'])}

Repository snapshot:
${snapshot}`;

if (provider === 'none') {
  console.error('No AI provider configured; autonomous improvement skipped.');
  process.exit(2);
}

async function askOpenAI() {
  const response = await fetch(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
    })
  });
  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
  return (await response.json()).choices?.[0]?.message?.content || '';
}

async function askGemini() {
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0 }
    })
  });
  if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
  return (await response.json()).candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
}

let patch = (provider === 'gemini' ? await askGemini() : await askOpenAI()).trim();
if (patch === 'NO_CHANGE') {
  console.log('GLORIFIER_NO_CHANGE');
  process.exit(0);
}
patch = patch.replace(/^\`\`\`(?:diff)?\s*/i, '').replace(/\s*\`\`\`$/i, '').trim();
if (!patch.startsWith('diff --git ')) throw new Error('Agent did not return a valid unified diff.');

const changedPaths = [...patch.matchAll(/^diff --git a\/(.+?) b\/(.+)$/gm)].flatMap((m) => [m[1], m[2]]);
if (changedPaths.some((path) => protectedPaths.some((rule) => rule.endsWith('/**') ? path.startsWith(rule.slice(0, -3)) : path === rule))) {
  throw new Error('Safety policy rejected a protected-file change.');
}
if (changedPaths.length > 12) throw new Error('Safety policy rejected an overly broad patch.');

fs.writeFileSync('/tmp/glorifier-improvement.patch', patch);
const applied = run('git', ['apply', '--whitespace=fix', '--recount', '/tmp/glorifier-improvement.patch']);
if (!applied.ok) throw new Error('Patch rejected: ' + applied.output);

const lint = run('npm', ['run', 'lint']);
const build = lint.ok ? run('npm', ['run', 'build']) : { ok: false, output: 'Skipped build because lint failed.' };
if (!lint.ok || !build.ok) {
  run('git', ['reset', '--hard', 'HEAD']);
  throw new Error(`Improvement failed verification. Lint: ${lint.ok}. Build: ${build.ok}.`);
}

console.log('GLORIFIER_AUTONOMOUS_IMPROVEMENT_VERIFIED');
console.log(patch);
