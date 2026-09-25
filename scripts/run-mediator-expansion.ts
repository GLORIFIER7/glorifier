import { buildGlorifierMediatorSnapshot, ensureCoreMediatorNodes } from '../src/lib/glorifier-mediator';

await ensureCoreMediatorNodes();

const snapshot = await buildGlorifierMediatorSnapshot();
console.log(JSON.stringify({
  version: snapshot.version,
  generatedAt: snapshot.generatedAt,
  nodeCounts: snapshot.nodeCounts,
  authorizedConnections: snapshot.authorizedConnections,
  totalConnections: snapshot.totalConnections
}, null, 2));
