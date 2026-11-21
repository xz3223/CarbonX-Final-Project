// Wallet-authenticated Flashpoint MCP bridge. All tool calls/payments are blocked.
// Private keys stay in the sibling .env; JWTs stay in memory for this process.
import { fileURLToPath } from 'node:url';
import { configuredWallet, createReplacementWallet } from './wallet-store.mjs';
import { configureX402, paymentStatus } from './x402-policy.mjs';
import { createPublicClient, http, erc20Abi, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { Agent, setGlobalDispatcher } from 'undici';

const BASE = 'https://api.flashpoint.ai';
const PV = '2025-06-18';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
setGlobalDispatcher(new Agent({ headersTimeout: 20000, bodyTimeout: 20000 }));
let nextId = 1;

export function wallet() { return configuredWallet(); }

export async function balance() {
  const account = wallet();
  const client = createPublicClient({ chain: base, transport: http(undefined, { timeout: 15000, retryCount: 0 }) });
  try {
    const raw = await client.readContract({ address: USDC, abi: erc20Abi,
      functionName: 'balanceOf', args: [account.address] });
    return formatUnits(raw, 6);
  } catch { throw new Error('Base USDC balance lookup failed; no transaction was submitted.'); }
}

async function post(route, body, headers, fetchImpl) {
  try {
    return await fetchImpl(`${BASE}${route}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch { throw new Error('Flashpoint network request failed or timed out.'); }
}

async function jsonResponse(response, label) {
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
  try { return await response.json(); }
  catch { throw new Error(`${label}: invalid JSON response`); }
}

export function parseRpcText(text, id) {
  const messages = [];
  try { messages.push(JSON.parse(text)); }
  catch {
    for (const event of text.replace(/\r\n/g, '\n').split(/\n\n/)) {
      const data = event.split('\n').filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trimStart()).join('\n');
      if (!data) continue;
      try { messages.push(JSON.parse(data)); } catch { /* Ignore SSE keepalives. */ }
    }
  }
  const message = messages.find(item => item?.jsonrpc === '2.0' && item.id === id);
  if (!message) throw new Error('MCP response is missing the requested JSON-RPC result.');
  if (message.error) throw new Error('MCP returned an error; upstream details were withheld.');
  if (!Object.hasOwn(message, 'result')) throw new Error('MCP response has no result.');
  return message.result;
}

async function rpc(session, method, params) {
  const id = nextId++;
  const response = await post('/mcp', { jsonrpc: '2.0', id, method, params }, session.headers, session.fetchImpl);
  if (response.status === 402) throw new Error('Payment required; payment signing and retries are disabled.');
  if (response.status === 401) throw new Error('Flashpoint session expired; run the command again to authenticate.');
  if (!response.ok) throw new Error(`MCP request: HTTP ${response.status}`);
  return { result: parseRpcText(await response.text(), id), response };
}

export async function connect({ fetchImpl = fetch, walletProvider = wallet } = {}) {
  // Never trust a stale JWT or a process-level wallet override.
  const account = walletProvider();
  if (process.env.FLASHPOINT_MCP_BASE && process.env.FLASHPOINT_MCP_BASE !== BASE) {
    throw new Error('Only the official Flashpoint endpoint is allowed.');
  }
  const challenge = await jsonResponse(await post('/auth/wallet/challenge', undefined, {}, fetchImpl), 'Challenge');
  if (typeof challenge.nonce !== 'string' || !challenge.nonce ||
      challenge.message_to_sign !== `flashpoint-mcp-auth:${challenge.nonce}`) {
    throw new Error('Invalid Flashpoint challenge; signing was refused.');
  }
  let signature;
  try { signature = await account.signMessage({ message: challenge.message_to_sign }); }
  catch { throw new Error('Local authentication signing failed.'); }
  const tokenResult = await jsonResponse(await post('/auth/wallet/token', {
    address: account.address, nonce: challenge.nonce, signature,
  }, {}, fetchImpl), 'Authentication');
  if (typeof tokenResult.token !== 'string' || !tokenResult.token) throw new Error('Authentication returned no token.');
  const session = {
    fetchImpl,
    headers: { Authorization: `Bearer ${tokenResult.token}`, Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': PV },
  };
  const initialized = await rpc(session, 'initialize', {
    protocolVersion: PV, capabilities: {}, clientInfo: { name: 'flashpoint-safe-cli', version: '1.0.0' },
  });
  if (!initialized.result?.protocolVersion || !initialized.result?.capabilities) {
    throw new Error('Invalid MCP initialization result.');
  }
  const sessionId = initialized.response.headers.get('mcp-session-id');
  if (sessionId) session.headers['Mcp-Session-Id'] = sessionId;
  const notified = await post('/mcp', { jsonrpc: '2.0', method: 'notifications/initialized' }, session.headers, fetchImpl);
  if (!notified.ok) throw new Error(`MCP initialized notification: HTTP ${notified.status}`);
  await notified.text();
  return session;
}

export async function listTools(session) {
  const { result } = await rpc(session, 'tools/list', {});
  if (!Array.isArray(result.tools)) throw new Error('Invalid MCP tools list.');
  return result.tools;
}

export async function callTool() {
  throw new Error('Tool calls and x402 payments are disabled. Separate approval with a maximum USDC amount and retry limit is required.');
}

export async function verify() {
  const account = wallet();
  const report = { address: account.address, walletConfiguration: 'verified', x402: paymentStatus(account.address) };
  configureX402(account);
  try { report.baseUsdcBalance = await balance(); }
  catch (error) { report.balanceStatus = error.message; }
  try {
    const session = await connect();
    report.authentication = 'verified';
    const tools = await listTools(session);
    report.mcp = 'verified';
    report.tools = tools.map(tool => tool.name).filter(name => typeof name === 'string');
  } catch (error) { report.flashpointStatus = error.message; }
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const [command, option] = process.argv.slice(2);
    if (command === 'create-wallet') {
      if (process.argv.length !== 4 || option !== '--confirm-replacement') throw new Error('Explicit --confirm-replacement is required.');
      console.log(createReplacementWallet({ confirmed: true }));
    } else if (command === 'wallet') {
      console.log(wallet().address);
    } else if (command === 'balance') {
      console.log(`${wallet().address}: ${await balance()} USDC on Base`);
    } else if (command === 'tools') {
      for (const tool of await listTools(await connect())) console.log(tool.name);
    } else if (command === 'verify') {
      console.log(JSON.stringify(await verify(), null, 2));
    } else if (command === 'payment-status') {
      const account = wallet();
      configureX402(account);
      console.log(JSON.stringify(paymentStatus(account.address), null, 2));
    } else if (command === 'call') {
      await callTool();
    } else {
      console.log('usage: node flashpoint.mjs wallet | balance | tools | verify | payment-status | create-wallet --confirm-replacement');
    }
  } catch (error) {
    const safe = /^(Explicit|Replacement|Configured|A conflicting|A replacement|Tool calls|Could not|Wallet generation|Refusing|Only the official|Base USDC|Flashpoint |Invalid Flashpoint|Invalid MCP|Local authentication|Authentication|Challenge|MCP |Payment required)/.test(error.message);
    console.error(safe ? error.message : 'Flashpoint operation failed. Credentials were not displayed.');
    process.exitCode = 1;
  }
}
