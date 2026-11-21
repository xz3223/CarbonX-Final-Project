import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm';

export const NETWORK = 'eip155:8453';
export const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BLOCKED = 'Payments disabled: separate explicit approval with maximum USDC and retry limit is required.';

export function paymentStatus(address) {
  return { configured: true, walletAddress: address, network: NETWORK, asset: USDC,
    paymentsEnabled: false, maximumUsdc: '0', retryLimit: 0, paidSettlementTested: false };
}

export function configureX402(account, fetchImpl = fetch) {
  const client = new x402Client()
    .register(NETWORK, new ExactEvmScheme(account))
    .registerPolicy((_version, requirements) => requirements.filter(requirement =>
      requirement.network === NETWORK && requirement.scheme === 'exact' &&
      requirement.asset.toLowerCase() === USDC.toLowerCase()))
    .onBeforePaymentCreation(async () => ({ abort: true, reason: BLOCKED }));
  // Refuse signed HTTP requests as well as payment payload creation.
  const unsignedFetch = (input, init = {}) => {
    const request = new Request(input, init);
    if (request.url !== 'https://api.flashpoint.ai/mcp') throw new Error('Only the official Flashpoint MCP endpoint is allowed.');
    if (request.headers.has('payment-signature') || request.headers.has('x-payment')) throw new Error(BLOCKED);
    return fetchImpl(request, { redirect: 'error' });
  };
  return { fetch: wrapFetchWithPayment(unsignedFetch, client) };
}
