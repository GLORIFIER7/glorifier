import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const findings = [];
const run = (command, args = []) => {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    findings.push({ command: [command, ...args].join(' '), error: String(error.stderr || error.message).slice(0, 2000) });
    return '';
  }
};

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const branch = run('git', ['branch', '--show-current']).trim();
const status = run('git', ['status', '--short']);
const health = run('npm', ['run', 'lint']);

const report = {
  timestamp: new Date().toISOString(),
  branch,
  packageVersion: pkg.version,
  workingTreeClean: !status.trim(),
  lintPassed: !findings.some((item) => item.command === 'npm run lint'),
  findings,
};

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/continuous-improvement.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
