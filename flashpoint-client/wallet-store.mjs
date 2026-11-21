import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

export const ENV = new URL('./.env', import.meta.url);
const fields = ['FLASHPOINT_WALLET_KEY', 'FLASHPOINT_EXPECTED_WALLET_ADDRESS', 'FLASHPOINT_REPLACEMENT_WALLET_CONFIRMED'];
const keyPattern = /^0x[0-9a-fA-F]{64}$/;
const addressPattern = /^0x[0-9a-fA-F]{40}$/;

export function parseEnv(text) {
  const values = {};
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

function readEnv(envPath) {
  if (!fs.existsSync(envPath)) return '';
  const stat = fs.lstatSync(envPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) {
    throw new Error('Refusing a linked or non-regular .env file.');
  }
  return fs.readFileSync(envPath, 'utf8');
}

export function configuredWallet(envPath = ENV, environment = process.env) {
  const values = parseEnv(readEnv(envPath));
  // Both the address and confirmation are pinned in the local file; an old
  // process-level key must never silently override the replacement wallet.
  if (values.FLASHPOINT_REPLACEMENT_WALLET_CONFIRMED !== 'true' ||
      !addressPattern.test(values.FLASHPOINT_EXPECTED_WALLET_ADDRESS ?? '')) {
    throw new Error('Replacement wallet is not confirmed. The compromised wallet is blocked.');
  }
  const key = values.FLASHPOINT_WALLET_KEY;
  if (!keyPattern.test(key ?? '')) throw new Error('Replacement wallet key is missing or invalid.');
  if (environment.FLASHPOINT_WALLET_KEY && environment.FLASHPOINT_WALLET_KEY !== key) {
    throw new Error('A conflicting process-level wallet key is configured. Remove it before continuing.');
  }
  let account;
  try { account = privateKeyToAccount(key); }
  catch { throw new Error('Replacement wallet key is invalid.'); }
  if (account.address.toLowerCase() !== values.FLASHPOINT_EXPECTED_WALLET_ADDRESS.toLowerCase()) {
    throw new Error('Configured key does not match the confirmed replacement public address.');
  }
  return account;
}

export function createReplacementWallet({
  confirmed = false,
  envPath = ENV,
  generateKey = generatePrivateKey,
} = {}) {
  if (confirmed !== true) throw new Error('Explicit confirmation is required before creating a replacement wallet.');
  const original = readEnv(envPath);
  const existing = parseEnv(original);
  if (existing.FLASHPOINT_REPLACEMENT_WALLET_CONFIRMED === 'true') {
    throw new Error('A replacement wallet is already confirmed. Refusing to overwrite it.');
  }
  // This is the only place that generates a key, and it is reached only after
  // explicit confirmation. No key, previous configuration or raw SDK error is logged.
  let key, account;
  try {
    key = generateKey();
    if (!keyPattern.test(key)) throw new Error();
    account = privateKeyToAccount(key);
  } catch { throw new Error('Wallet generation failed; configuration was not changed.'); }
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const preserved = original.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => {
    const match = line.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=/);
    return !match || !fields.includes(match[1]);
  }).join(newline).replace(/[\r\n]+$/, '');
  const next = (preserved ? preserved + newline : '') + [
    `FLASHPOINT_WALLET_KEY=${key}`,
    `FLASHPOINT_EXPECTED_WALLET_ADDRESS=${account.address}`,
    'FLASHPOINT_REPLACEMENT_WALLET_CONFIRMED=true',
    '',
  ].join(newline);
  const destination = envPath instanceof URL ? new URL(envPath) : path.resolve(envPath);
  const temporary = destination instanceof URL
    ? new URL(`./.env.pending-${randomUUID()}`, destination)
    : path.join(path.dirname(destination), `.env.pending-${randomUUID()}`);
  let fd;
  try {
    fd = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(fd, next, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(temporary, destination);
  } catch {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    throw new Error('Could not securely save the replacement wallet. No key was displayed.');
  }
  return account.address;
}
