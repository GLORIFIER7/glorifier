import { runGlobalCollaborationCycle } from '../src/lib/global-collaboration-orchestrator';

const limit = Number(process.env.GLORIFIER_COLLABORATION_LIMIT || 200);
const result = await runGlobalCollaborationCycle('github-actions-global-collaboration', limit);
console.log(JSON.stringify(result, null, 2));
