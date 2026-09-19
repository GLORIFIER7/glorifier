import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { MonetizationPolicy, ActiveDataGrant, UsageTelemetryEvent } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Save Policy for User
export async function saveUserPolicy(userId: string, policy: MonetizationPolicy) {
  const path = `users/${userId}/policies/default`;
  try {
    await setDoc(doc(db, 'users', userId, 'policies', 'default'), {
      ...policy,
      userId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Save Active Grant
export async function saveActiveGrant(userId: string, grant: ActiveDataGrant) {
  const path = `users/${userId}/grants/${grant.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'grants', grant.id), {
      ...grant,
      userId
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Save Telemetry Event
export async function recordTelemetryEvent(userId: string, event: UsageTelemetryEvent) {
  const path = `users/${userId}/telemetry/${event.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'telemetry', event.id), {
      ...event,
      userId
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Subscribe to User Policy
export function subscribeToUserPolicy(userId: string, onUpdate: (policy: MonetizationPolicy) => void) {
  const path = `users/${userId}/policies/default`;
  return onSnapshot(doc(db, 'users', userId, 'policies', 'default'), (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as MonetizationPolicy);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

// Subscribe to Active Grants
export function subscribeToUserGrants(userId: string, onUpdate: (grants: ActiveDataGrant[]) => void) {
  const path = `users/${userId}/grants`;
  const q = query(collection(db, 'users', userId, 'grants'));
  return onSnapshot(q, (snap) => {
    const list: ActiveDataGrant[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data() as ActiveDataGrant);
    });
    if (list.length > 0) {
      onUpdate(list);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}
