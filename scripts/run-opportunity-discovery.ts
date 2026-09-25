import { run24x7OpportunityDiscoveryCycle } from '../src/lib/24x7-opportunity-discovery';
import { discoverGithubBounties } from '../src/lib/github-bounty-pipeline';

async function main() {
  const cycle = await run24x7OpportunityDiscoveryCycle('github-actions-discovery');
  const github = await discoverGithubBounties(50);
  console.log(JSON.stringify({
    ok: true,
    discoveryRunId: cycle.runId,
    sourcesScanned: cycle.sourcesScanned,
    findingsObserved: cycle.findingsObserved,
    opportunitiesCreated: cycle.opportunitiesCreated,
    githubBountyRows: github.length,
    economicTruth: 'OBSERVED — NOT VERIFIED REVENUE'
  }, null, 2));
}
main().catch((error) => {
  console.error('[GLORIFIER] opportunity discovery failed:', error);
  process.exitCode = 1;
});
