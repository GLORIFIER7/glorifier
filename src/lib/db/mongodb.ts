import { MongoClient, Db } from 'mongodb';

let clientPromise: Promise<MongoClient> | null = null;

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not configured');
  }
  return uri;
}

export function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const client = new MongoClient(getMongoUri());
    clientPromise = client.connect();
  }
  return clientPromise!;
}

export async function getMongoDb(): Promise<Db> {
  const databaseName = process.env.MONGODB_DB;
  if (!databaseName) {
    throw new Error('MONGODB_DB is not configured');
  }

  const client = await getMongoClient();
  return client.db(databaseName);
}

export async function checkMongoDb(): Promise<{
  ok: boolean;
  database?: string;
  latencyMs?: number;
  error?: string;
}> {
  const started = Date.now();

  try {
    const db = await getMongoDb();
    await db.command({ ping: 1 });

    return {
      ok: true,
      database: db.databaseName,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : 'MongoDB connection failed',
    };
  }
}
