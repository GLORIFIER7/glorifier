import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';
import { authorizeCapability } from './capability-authorization';
import { getConnection, recordConnectionEvent } from './connection-registry';

export const GLORIFIER_CRYPTOGRAPHIC_TRUST_VERSION = 'GCTWG-1.0';

export type CryptoOperation =
  | 'hash'
  | 'verify_hash'
  | 'sign'
  | 'verify_signature'
  | 'encrypt'
  | 'decrypt'
  | 'derive_address'
  | 'wallet_sign'
  | 'wallet_verify'
  | 'wallet_balance'
  | 'wallet_prepare_transfer'
  | 'wallet_broadcast';

export type CryptoKeyClass = 'signing' | 'encryption' | 'authentication' | 'wallet';
export type WalletNetwork = 'bitcoin' | 'ethereum' | 'evm' | 'solana' | 'generic';

export type CryptoRequest = {
  operation: CryptoOperation;
  requester: string;
  connectionId?: string | null;
  keyRef?: string | null;
  walletRef?: string | null;
  network?: WalletNetwork | null;
  payload?: string | null;
  signature?: string | null;
  publicKey?: string | null;
  algorithm?: string | null;
  humanApproved?: boolean;
  evidenceRefs?: string[];
};

const OPERATION_CAPABILITY: Record<CryptoOperation, string> = {
  hash: 'crypto.hash',
  verify_hash: 'crypto.verify',
  sign: 'crypto.sign',
  verify_signature: 'crypto.verify',
  encrypt: 'crypto.encrypt',
  decrypt: 'crypto.decrypt',
  derive_address: 'wallet.derive_address',
  wallet_sign: 'wallet.sign',
  wallet_verify: 'wallet.verify',
  wallet_balance: 'wallet.read',
  wallet_prepare_transfer: 'wallet.prepare_transfer',
  wallet_broadcast: 'wallet.broadcast'
};

const HIGH_RISK = new Set<CryptoOperation>([
  'sign', 'decrypt', 'wallet_sign', 'wallet_prepare_transfer', 'wallet_broadcast'
]);

export async function initializeCryptographicTrustGateway() {
  const db = getPostgresPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS cryptographic_trust_operations (
      id TEXT PRIMARY KEY,
      operation TEXT NOT NULL,
      requester TEXT NOT NULL,
      capability TEXT NOT NULL,
      status TEXT NOT NULL,
      connection_id TEXT,
      key_ref TEXT,
      wallet_ref TEXT,
      network TEXT,
      algorithm TEXT,
      payload_hash TEXT,
      result_hash TEXT,
      evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
      policy JSONB NOT NULL DEFAULT '{}'::jsonb,
      external_reference TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_crypto_trust_ops_created
      ON cryptographic_trust_operations(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_crypto_trust_ops_wallet
      ON cryptographic_trust_operations(wallet_ref, created_at DESC);
  `);
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function safeAlgorithm(value?: string | null): string {
  return String(value || 'SHA-256').trim().slice(0, 80);
}

function publicOperation(operation: CryptoOperation): boolean {
  return operation === 'hash' || operation === 'verify_hash' || operation === 'verify_signature' || operation === 'wallet_verify';
}

async function recordOperation(input: CryptoRequest, capability: string, status: string, payloadHash: string | null, resultHash: string | null, policy: Record<string, unknown>, externalReference?: string | null) {
  await initializeCryptographicTrustGateway();
  const id = `ctop-${crypto.randomUUID()}`;
  await getPostgresPool().query(
    `INSERT INTO cryptographic_trust_operations
      (id,operation,requester,capability,status,connection_id,key_ref,wallet_ref,network,algorithm,payload_hash,result_hash,evidence_refs,policy,external_reference)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      id, input.operation, input.requester, capability, status,
      input.connectionId || null, input.keyRef || null, input.walletRef || null,
      input.network || null, safeAlgorithm(input.algorithm),
      payloadHash, resultHash, JSON.stringify(input.evidenceRefs || []),
      JSON.stringify(policy), externalReference || null
    ]
  );
  return id;
}

export function getCryptographicTrustPolicy() {
  return {
    version: GLORIFIER_CRYPTOGRAPHIC_TRUST_VERSION,
    principle: 'Keys and wallet signing authority remain outside normal application and AI context.',
    architecture: [
      'AI CEO / agent requests operation',
      'Capability Authorization evaluates least privilege',
      'Connection Registry resolves authorized provider/identity',
      'Cryptographic Trust Gateway applies operation policy',
      'External HSM/KMS/vault or wallet signer performs privileged key operation',
      'Only non-secret result returns',
      'Neon records evidence, hashes, status and external references'
    ],
    rules: {
      privateKeysReturnedToAI: false,
      privateKeysStoredInNeon: false,
      privateKeysStoredInRepository: false,
      secretsLogged: false,
      walletBalanceIsNotRevenue: true,
      unsignedTransferIsNotPayment: true,
      providerConfirmationRequiredForSettlement: true,
      humanAuthorityForIrreversibleWalletMovement: true,
      defaultDenyUnknownOperations: true
    },
    operations: Object.entries(OPERATION_CAPABILITY).map(([operation, capability]) => ({
      operation, capability, highRisk: HIGH_RISK.has(operation as CryptoOperation),
      publicResultOnly: publicOperation(operation as CryptoOperation)
    }))
  };
}

export async function requestCryptographicOperation(input: CryptoRequest) {
  await initializeCryptographicTrustGateway();
  const operation = input.operation;
  const capability = OPERATION_CAPABILITY[operation];
  if (!capability) throw new Error('Unknown cryptographic operation');

  const auth = authorizeCapability({
    capability,
    requestedBy: input.requester,
    humanApproved: input.humanApproved === true
  });

  const payloadHash = input.payload == null ? null : sha256(input.payload);
  const requiresApproval = HIGH_RISK.has(operation);
  const allowed = auth.allowed && (!requiresApproval || input.humanApproved === true);

  const policy = {
    requiresHumanApproval: requiresApproval,
    capabilityAuthorized: auth.allowed,
    executionEnabled: false,
    privateKeyBoundary: 'external-vault-or-wallet-signer'
  };

  if (!allowed) {
    const id = await recordOperation(input, capability, 'approval-required', payloadHash, null, policy);
    return {
      id, status: 'approval-required', operation, capability,
      humanApprovalRequired: true, executionEnabled: false,
      privateKeyExposed: false,
      economicTruth: operation.startsWith('wallet_') ? 'NO TRANSFER EXECUTED' : undefined
    };
  }

  if (operation === 'hash') {
    const result = sha256(String(input.payload || ''));
    const id = await recordOperation(input, capability, 'completed', payloadHash, sha256(result), policy);
    return { id, status: 'completed', operation, result, resultHash: sha256(result), privateKeyExposed: false };
  }

  if (operation === 'verify_hash') {
    const expected = String(input.signature || '').trim().toLowerCase();
    const actual = sha256(String(input.payload || ''));
    const valid = Boolean(expected) && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
    const id = await recordOperation(input, capability, 'completed', payloadHash, sha256(String(valid)), policy);
    return { id, status: 'completed', operation, valid, privateKeyExposed: false };
  }

  if (operation === 'wallet_balance' && input.connectionId) {
    const connection = await getConnection(input.connectionId);
    if (!connection || connection.status !== 'authorized') {
      const id = await recordOperation(input, capability, 'connection-not-authorized', payloadHash, null, policy);
      return { id, status: 'connection-not-authorized', operation, humanApprovalRequired: true, executionEnabled: false, privateKeyExposed: false };
    }
  }

  // Privileged signing, decryption and wallet movement deliberately stop at the trust boundary.
  // Provider-specific HSM/KMS/wallet adapters can consume this request without returning key material.
  const id = await recordOperation(
    input,
    capability,
    'queued-for-secure-provider',
    payloadHash,
    null,
    policy
  );

  if (input.connectionId) {
    await recordConnectionEvent(input.connectionId, 'cryptographic_operation_requested', input.requester, {
      operation, operationId: id, capability, walletRef: input.walletRef || null
    });
  }

  return {
    id,
    status: 'queued-for-secure-provider',
    operation,
    capability,
    humanApprovalRequired: requiresApproval,
    executionEnabled: false,
    privateKeyExposed: false,
    secureProviderRequired: true,
    nextStep: 'Connect an HSM/KMS/isolated wallet signer through the Connection Registry.',
    economicTruth: operation.startsWith('wallet_') ? 'REQUESTED — NOT SETTLED' : undefined
  };
}

export async function listCryptographicTrustOperations(limit = 100) {
  await initializeCryptographicTrustGateway();
  const result = await getPostgresPool().query(
    'SELECT * FROM cryptographic_trust_operations ORDER BY created_at DESC LIMIT $1',
    [Math.max(1, Math.min(500, limit))]
  );
  return result.rows.map((x: any) => ({
    id: x.id, operation: x.operation, requester: x.requester, capability: x.capability,
    status: x.status, connectionId: x.connection_id, keyRef: x.key_ref, walletRef: x.wallet_ref,
    network: x.network, algorithm: x.algorithm, payloadHash: x.payload_hash,
    resultHash: x.result_hash, evidenceRefs: x.evidence_refs || [], policy: x.policy || {},
    externalReference: x.external_reference, createdAt: x.created_at
  }));
}
