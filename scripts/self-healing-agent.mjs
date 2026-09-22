#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const run = (cmd,args=[]) => {
  try { return {ok:true, output:execFileSync(cmd,args,{encoding:'utf8',stdio:['ignore','pipe','pipe']})}; }
  catch(e) { return {ok:false, output:`${e.stdout||''}\n${e.stderr||e.message}`.trim()}; }
};

const repo=process.env.GITHUB_REPOSITORY;
if(!repo) throw new Error('GITHUB_REPOSITORY is required');

const status=run('git',['status','--short']);
if(status.ok && status.output.trim()) {
  run('git',['reset','--hard','HEAD']);
  run('git',['clean','-fd']);
}

const lint=run('npm',['run','lint']);
const build=lint.ok ? run('npm',['run','build']) : {ok:false,output:'Build skipped because lint failed.'};

console.log('GLORIFIER_SELF_HEAL_START');
console.log(JSON.stringify({
  repository:repo,
  cleanWorkspace:status.ok,
  lint:{ok:lint.ok,output:lint.output.slice(-6000)},
  build:{ok:build.ok,output:build.output.slice(-6000)},
},null,2));

if(lint.ok && build.ok) {
  console.log('GLORIFIER_SELF_HEAL_RECOVERED: reverted failed patch and restored a verified baseline.');
  process.exit(0);
}

// Attempt a bounded automatic retry using the existing autonomous agent.
// It may produce a fresh patch; the agent itself enforces protected-path and lint/build gates.
const retry=run('node',['scripts/continuous-improvement-agent.mjs']);
console.log(retry.output);
if(retry.ok) {
  const diff=run('git',['diff','--quiet']);
  if(diff.ok) {
    console.log('GLORIFIER_SELF_HEAL_RETRY_NO_CHANGE');
    process.exit(0);
  }
  const commit=run('git',['config','user.name','Glorifier AI Self-Healing Agent']);
  run('git',['config','user.email','41898282+github-actions[bot]@users.noreply.github.com']);
  const add=run('git',['add','-A']);
  const c=run('git',['commit','-m','fix: self-healed autonomous development cycle [skip ci]']);
  if(c.ok) {
    const push=run('git',['push','origin','HEAD:main']);
    if(push.ok) {
      console.log('GLORIFIER_SELF_HEAL_RETRY_COMMITTED');
      process.exit(0);
    }
  }
}
console.error('GLORIFIER_SELF_HEAL_FAILED: baseline or bounded retry could not be verified.');
process.exit(1);
