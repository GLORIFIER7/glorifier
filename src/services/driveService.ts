import { getAccessToken } from '../lib/firebase';
import { DriveAnalysisItem } from '../types';

export interface DriveApiFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  shared?: boolean;
  webViewLink?: string;
  iconLink?: string;
  description?: string;
}

export interface ListDriveFilesResult {
  files: DriveApiFile[];
  nextPageToken?: string;
}

/**
 * Fetch files from Google Drive v3 REST API
 */
export async function listDriveFiles(pageSize = 25, query = ''): Promise<ListDriveFilesResult> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Google Drive access token is not available. Please sign in with Google to grant access.');
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('pageSize', pageSize.toString());
  url.searchParams.set('fields', 'nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,shared,webViewLink,iconLink,description)');
  url.searchParams.set('orderBy', 'modifiedTime desc');
  
  // Exclude trashed files by default
  const qParts = ['trashed = false'];
  if (query.trim()) {
    qParts.push(query);
  }
  url.searchParams.set('q', qParts.join(' and '));

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return {
    files: data.files || [],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Categorizes and analyzes a Google Drive file for privacy risk and sovereign monetization potential
 */
export function analyzeDriveFileForSovereignty(file: DriveApiFile): DriveAnalysisItem {
  const nameLower = file.name.toLowerCase();
  const mime = file.mimeType.toLowerCase();

  let category: DriveAnalysisItem['category'] = 'Documents & Research';
  let yieldUsd = 0.45;
  let baseRisk = 20;
  const sensitiveSignals: string[] = [];

  // Determine category
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime.includes('csv') ||
    nameLower.endsWith('.csv') ||
    nameLower.endsWith('.xlsx')
  ) {
    category = 'Spreadsheets & Finance';
    yieldUsd = 1.65;
    baseRisk = 45;
  } else if (
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    nameLower.endsWith('.pptx') ||
    nameLower.endsWith('.key')
  ) {
    category = 'Presentations & Strategy';
    yieldUsd = 0.95;
    baseRisk = 30;
  } else if (
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('python') ||
    mime.includes('zip') ||
    mime.includes('tar') ||
    nameLower.endsWith('.py') ||
    nameLower.endsWith('.ts') ||
    nameLower.endsWith('.zip')
  ) {
    category = 'Code & Architecture';
    yieldUsd = 1.20;
    baseRisk = 35;
  } else if (
    mime.includes('image') ||
    mime.includes('video') ||
    mime.includes('audio') ||
    mime.includes('photoshop')
  ) {
    category = 'Media & Creative';
    yieldUsd = 0.60;
    baseRisk = 15;
  } else if (mime.includes('folder')) {
    category = 'Archival & Other';
    yieldUsd = 0.20;
    baseRisk = 10;
  }

  // Detect sensitive keywords
  const sensitiveKeywords = [
    { word: 'tax', signal: 'Taxation / IRS Record' },
    { word: 'invoice', signal: 'Commercial Billing / Invoice' },
    { word: 'receipt', signal: 'Purchase Receipt' },
    { word: 'passport', signal: 'Government Identity Document' },
    { word: 'license', signal: 'Official License Document' },
    { word: 'contract', signal: 'Legal / NDA Agreement' },
    { word: 'salary', signal: 'Compensation / Payroll Telemetry' },
    { word: 'budget', signal: 'Fiscal Financial Planning' },
    { word: 'statement', signal: 'Banking / Card Statement' },
    { word: 'confidential', signal: 'Explicit Confidential Marking' },
    { word: 'secret', signal: 'Proprietary Credentials' },
    { word: 'resume', signal: 'Personal CV & Employment History' },
    { word: 'medical', signal: 'Health & Clinical Record' },
  ];

  for (const item of sensitiveKeywords) {
    if (nameLower.includes(item.word)) {
      sensitiveSignals.push(item.signal);
      baseRisk += 25;
      yieldUsd += 0.40;
    }
  }

  // Shared external risk multiplier
  if (file.shared) {
    sensitiveSignals.push('External Sharing Enabled (Public / Team link)');
    baseRisk += 20;
  }

  const finalRisk = Math.min(Math.max(baseRisk, 12), 98);

  // Determine governance action based on risk
  let governanceAction: DriveAnalysisItem['governanceAction'] = 'ZK-Proof Vector Index';
  let dpNoise = 'Laplace (ε = 0.35)';

  if (finalRisk >= 75) {
    governanceAction = 'Strict Enclave Lockdown';
    dpNoise = 'Total Masking (No Raw Exposure)';
    yieldUsd = 0.10; // High protection, minimal indexing
  } else if (finalRisk >= 40) {
    governanceAction = 'Differential Privacy Scrub';
    dpNoise = 'Laplace (ε = 0.20)';
  } else if (file.shared && finalRisk < 30) {
    governanceAction = 'Safe Public Commons';
    dpNoise = 'k-Anonymity (k = 50)';
  }

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    sizeBytes: file.size ? parseInt(file.size, 10) : undefined,
    createdTime: file.createdTime ? new Date(file.createdTime).toLocaleDateString() : undefined,
    modifiedTime: file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : undefined,
    shared: !!file.shared,
    webViewLink: file.webViewLink,
    iconLink: file.iconLink,
    category,
    leakRiskScore: finalRisk,
    sensitiveSignals,
    governanceAction,
    estimatedYieldUsd: Number(yieldUsd.toFixed(2)),
    differentialPrivacyNoiseLevel: dpNoise,
  };
}

/**
 * Creates a Data Sovereignty Governance Manifest file directly in user's Google Drive.
 * MANDATORY: Call this only after explicit user confirmation dialog!
 */
export async function createDriveGovernanceManifest(
  fileName: string,
  manifestData: Record<string, any>
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Google Drive access token missing.');
  }

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'DataSovereign AI Governance Certificate & Zero-Knowledge Verification Manifest',
  };

  const content = JSON.stringify(manifestData, null, 2);
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    content +
    closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload manifest to Drive: ${errorText}`);
  }

  return await response.json();
}

/**
 * Deletes a file from Google Drive.
 * MANDATORY: Call this only after explicit user confirmation dialog!
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Google Drive access token missing.');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const errorText = await response.text();
    throw new Error(`Failed to delete Drive file: ${errorText}`);
  }
}
