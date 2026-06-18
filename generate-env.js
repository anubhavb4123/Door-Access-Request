// ============================================
// Generates frontend/env.js from the root .env file
// Run: node generate-env.js
// ============================================

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, 'render-service', '.env');

// Parse .env file
function parseEnv(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    vars[key] = value;
  }
  return vars;
}

const env = parseEnv(envPath);

// Pick only the frontend Firebase keys
const frontendEnv = {
  FIREBASE_API_KEY: env.FIREBASE_API_KEY || '',
  FIREBASE_AUTH_DOMAIN: env.FIREBASE_AUTH_DOMAIN || '',
  FIREBASE_DATABASE_URL: env.FIREBASE_DATABASE_URL || '',
  FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID || '',
  FIREBASE_STORAGE_BUCKET: env.FIREBASE_STORAGE_BUCKET || '',
  FIREBASE_MESSAGING_SENDER_ID: env.FIREBASE_MESSAGING_SENDER_ID || '',
  FIREBASE_APP_ID: env.FIREBASE_APP_ID || ''
};

const output = `// Auto-generated from .env — DO NOT EDIT MANUALLY
window.ENV = ${JSON.stringify(frontendEnv, null, 2)};
`;

const outPath = resolve(__dirname, 'frontend', 'env.js');
writeFileSync(outPath, output, 'utf-8');
console.log(`✅ Generated ${outPath}`);
