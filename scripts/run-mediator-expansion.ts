import { buildGlorifierMediatorSnapshot } from '../src/lib/glorifier-mediator';

const snapshot = await buildGlorifierMediatorSnapshot();
console.log(JSON.stringify({
  version: snapshot.version,
  generatedAt: snapshot.generatedAt,
  nodeCounts: snapshot.nodeCounts,
  authorizedConnections: snapshot.authorizedConnections,
  totalConnections: snapshot.totalConnections
}, null, 2));
