import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connect, listTools, parseRpcText } from './flashpoint.mjs';
import { configureX402, NETWORK, USDC } from './x402-policy.mjs';

test('JSON-RPC parsing matches the response ID instead of trailing progress messages', () => {
  const stream = 'data: {"jsonrpc":"2.0","id":9,"result":{"tools":[]}}\n\n' +
    'data: {"jsonrpc":"2.0","method":"notifications/progress"}\n\n';
  assert.deepEqual(parseRpcText(stream, 9), { tools: [] });
  assert.throws(() => parseRpcText(stream, 8), /missing/);
});

test('authentication rejects unexpected challenge text before signing', async () => {
  let signed = false;
  await assert.rejects(connect({
    walletProvider: () => ({ address: 'public-fixture', signMessage: async () => { signed = true; } }),
    fetchImpl: async () => Response.json({ nonce: 'fixture', message_to_sign: 'unexpected message' }),
  }), /signing was refused/);
  assert.ok(!signed);
});

test('wallet auth and stateless MCP initialization/listing use fresh in-memory bearer', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    assert.equal(init.redirect, 'error');
    if (url.endsWith('/challenge')) return Response.json({ nonce: 'fixture', message_to_sign: 'flashpoint-mcp-auth:fixture' });
    if (url.endsWith('/token')) return Response.json({ token: 'opaque-test-token' });
    const request = JSON.parse(init.body);
    assert.equal(init.headers.Authorization, 'Bearer opaque-test-token');
    assert.ok(!Object.hasOwn(init.headers, 'Mcp-Session-Id'));
    if (request.method === 'notifications/initialized') return new Response(null, { status: 202 });
    return Response.json({ jsonrpc: '2.0', id: request.id, result: request.method === 'initialize'
      ? { protocolVersion: '2025-06-18', capabilities: {} } : { tools: [{ name: 'tool_survey' }] } });
  };
  const session = await connect({ fetchImpl: fakeFetch, walletProvider: () => ({
    address: 'public-fixture', signMessage: async ({ message }) => {
      assert.equal(message, 'flashpoint-mcp-auth:fixture'); return 'fixture-signature';
    },
  }) });
  assert.equal((await listTools(session))[0].name, 'tool_survey');
  assert.ok(calls.every(call => !new Headers(call.init.headers).has('payment-signature')));
});

test('HTTP 402 during free discovery is never retried or paid', async () => {
  let requests = 0;
  const session = { headers: {}, fetchImpl: async () => { requests++; return new Response('', { status: 402 }); } };
  await assert.rejects(listTools(session), /payment signing and retries are disabled/);
  assert.equal(requests, 1);
});

test('real x402 SDK refuses payment before invoking the signer or retrying HTTP', async () => {
  let signingCalls = 0, httpCalls = 0;
  const signer = { address: '0x' + '1'.repeat(40), signTypedData: async () => { signingCalls++; throw new Error('must not sign'); } };
  const paymentRequired = {
    x402Version: 2, resource: { url: 'https://api.flashpoint.ai/mcp', description: 'Offline test', mimeType: 'application/json' },
    accepts: [{ scheme: 'exact', network: NETWORK, amount: '500000', asset: USDC,
      payTo: '0x' + '2'.repeat(40), maxTimeoutSeconds: 60, extra: { name: 'USD Coin', version: '2' } }],
  };
  const configured = configureX402(signer, async () => {
    httpCalls++;
    return new Response(null, { status: 402, headers: { 'payment-required': Buffer.from(JSON.stringify(paymentRequired)).toString('base64') } });
  });
  await assert.rejects(configured.fetch('https://api.flashpoint.ai/mcp', { method: 'POST' }), /Payments disabled/);
  assert.equal(signingCalls, 0);
  assert.equal(httpCalls, 1);
});

test('payment transport rejects foreign endpoints before making a request', async () => {
  let called = false;
  const configured = configureX402({ address: '0x' + '1'.repeat(40), signTypedData: async () => {} }, async () => { called = true; });
  await assert.rejects(configured.fetch('https://example.com/mcp'), /official Flashpoint/);
  assert.ok(!called);
});
