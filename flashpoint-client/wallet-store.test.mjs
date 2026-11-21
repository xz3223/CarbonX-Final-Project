import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configuredWallet, createReplacementWallet, parseEnv } from './wallet-store.mjs';
import { callTool } from './flashpoint.mjs';

// Public, deterministic test fixtures only. No random wallet generation or network.
const fixtureKey = '0x' + '0'.repeat(63) + '1';
const fixtureAddress = '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf';
function fixture(t, content = '') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flashpoint-wallet-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const envPath = path.join(dir, '.env');
  fs.writeFileSync(envPath, content);
  return envPath;
}
test('creation without confirmation never generates a key or changes the file', t => {
  const envPath = fixture(t, 'KEEP=value\n');
  let called = false;
  assert.throws(() => createReplacementWallet({ envPath, generateKey: () => { called = true; } }), /confirmation/);
  assert.ok(!called);
  assert.ok(fs.readFileSync(envPath, 'utf8') === 'KEEP=value\n');
});
test('explicit replacement preserves unrelated settings and pins the public address', t => {
  const envPath = fixture(t, '# settings\r\nKEEP=value\r\nFLASHPOINT_WALLET_KEY=old\r\nexport FLASHPOINT_WALLET_KEY="duplicate"\r\n');
  const address = createReplacementWallet({ confirmed: true, envPath, generateKey: () => fixtureKey });
  assert.equal(address, fixtureAddress);
  const saved = fs.readFileSync(envPath, 'utf8');
  assert.ok(saved.startsWith('# settings\r\nKEEP=value\r\n'));
  assert.equal((saved.match(/^FLASHPOINT_WALLET_KEY=/gm) || []).length, 1);
  assert.ok(parseEnv(saved).FLASHPOINT_WALLET_KEY === fixtureKey);
  assert.equal(configuredWallet(envPath, {}).address, address);
  assert.equal(fs.readdirSync(path.dirname(envPath)).length, 1);
});
test('a repeated creation refuses to replace the new wallet', t => {
  const envPath = fixture(t, 'FLASHPOINT_REPLACEMENT_WALLET_CONFIRMED=true\n');
  let called = false;
  assert.throws(() => createReplacementWallet({ confirmed: true, envPath, generateKey: () => { called = true; } }), /already confirmed/);
  assert.ok(!called);
});
test('old credentials cannot be used without replacement confirmation', t => {
  const envPath = fixture(t, `FLASHPOINT_WALLET_KEY=${fixtureKey}\n`);
  assert.throws(() => configuredWallet(envPath, {}), /compromised wallet is blocked/);
});
test('a stale process key and mismatched expected address are blocked', t => {
  const envPath = fixture(t);
  createReplacementWallet({ confirmed: true, envPath, generateKey: () => fixtureKey });
  assert.throws(() => configuredWallet(envPath, { FLASHPOINT_WALLET_KEY: 'stale' }), /conflicting/);
  const content = fs.readFileSync(envPath, 'utf8').replace(fixtureAddress, '0x' + '0'.repeat(40));
  fs.writeFileSync(envPath, content);
  assert.throws(() => configuredWallet(envPath, {}), /does not match/);
});
test('generation errors never reveal key material or change the configuration', t => {
  const envPath = fixture(t, 'KEEP=value\n');
  assert.throws(() => createReplacementWallet({ confirmed: true, envPath, generateKey: () => { throw new Error(fixtureKey); } }), /^Error: Wallet generation failed/);
  assert.ok(fs.readFileSync(envPath, 'utf8') === 'KEEP=value\n');
});
test('tool and payment calls fail before any request', async () => {
  await assert.rejects(callTool(null, 'tool_survey', {}), /payments are disabled/);
});
