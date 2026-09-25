import { runGlobalResolutionCycle } from '../src/lib/global-resolution-engine';

const limit = Number(process.env.GLORIFIER_RESOLUTION_LIMIT || 200);
const result = await runGlobalResolutionCycle('github-actions-global-resolution', limit);
console.log(JSON.stringify(result, null, 2));
