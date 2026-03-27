import { mnemonicToPrivateKey } from '@ton/crypto';
import { Address, TonClient, WalletContractV4, fromNano, internal, toNano } from '@ton/ton';

import { mapTonTransaction } from '@/entities/transaction/lib/transaction-mapper';
import type { WalletTransaction } from '@/entities/transaction/model/types';
import {
  TON_TESTNET_API_KEY,
  TON_TESTNET_ENDPOINT,
  TON_TESTNET_FALLBACK_ENDPOINTS,
  TRANSACTIONS_LIMIT
} from '@/shared/config/constants';

const tonEndpoints = Array.from(new Set([TON_TESTNET_ENDPOINT, ...TON_TESTNET_FALLBACK_ENDPOINTS]));
const tonClients = new Map<string, TonClient>();
let preferredEndpointIndex = 0;

const getTonClientByEndpoint = (endpoint: string): TonClient => {
  const existing = tonClients.get(endpoint);
  if (existing) {
    return existing;
  }

  const client = new TonClient({
    endpoint,
    apiKey: TON_TESTNET_API_KEY || undefined
  });

  tonClients.set(endpoint, client);
  return client;
};

const getPreferredTonClient = (): TonClient => {
  return getTonClientByEndpoint(tonEndpoints[preferredEndpointIndex] ?? TON_TESTNET_ENDPOINT);
};

const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const isRetriableRpcError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes('no workers available') ||
    message.includes('failed to get session') ||
    message.includes('code":542') ||
    message.includes('code: 542') ||
    message.includes('timeout') ||
    message.includes('temporarily unavailable')
  );
};

const withReadRpcRetry = async <T>(
  operation: (client: TonClient) => Promise<T>,
  label: string
): Promise<T> => {
  const endpointsCount = Math.max(1, tonEndpoints.length);
  const maxAttempts = Math.max(3, endpointsCount * 2);
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const endpointIndex = (preferredEndpointIndex + attempt) % endpointsCount;
    const endpoint = tonEndpoints[endpointIndex] ?? TON_TESTNET_ENDPOINT;
    const client = getTonClientByEndpoint(endpoint);

    try {
      const result = await operation(client);
      preferredEndpointIndex = endpointIndex;
      return result;
    } catch (error) {
      lastError = error;

      if (!isRetriableRpcError(error) || attempt === maxAttempts - 1) {
        break;
      }

      const backoffMs = Math.min(4_000, 500 * 2 ** attempt);
      await delay(backoffMs);
    }
  }

  const baseMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${label} failed after retry/failover: ${baseMessage}`);
};

const getWalletContractByMnemonic = async (mnemonic: string[]): Promise<WalletContractV4> => {
  const keyPair = await mnemonicToPrivateKey(mnemonic);

  return WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey
  });
};

export const getWalletBalanceTon = async (addressRaw: string): Promise<string> => {
  const balance = await withReadRpcRetry(
    async (client) => client.getBalance(Address.parse(addressRaw)),
    'getWalletBalanceTon'
  );

  return fromNano(balance);
};

export const getWalletTransactions = async (
  addressRaw: string,
  limit = TRANSACTIONS_LIMIT
): Promise<WalletTransaction[]> => {
  const transactions = await withReadRpcRetry(
    async (client) => client.getTransactions(Address.parse(addressRaw), { limit }),
    'getWalletTransactions'
  );

  return transactions.map((transaction) => mapTonTransaction(transaction, addressRaw));
};

export const sendTonTransfer = async (input: {
  mnemonic: string[];
  toAddress: string;
  amountTon: string;
}): Promise<{ seqno: number; reference: string }> => {
  const client = getPreferredTonClient();
  const keyPair = await mnemonicToPrivateKey(input.mnemonic);
  const walletContract = await getWalletContractByMnemonic(input.mnemonic);
  const openedWallet = client.open(walletContract);

  const seqno = await openedWallet.getSeqno();

  await openedWallet.sendTransfer({
    secretKey: keyPair.secretKey,
    seqno,
    messages: [
      internal({
        to: input.toAddress,
        value: toNano(input.amountTon),
        bounce: false
      })
    ]
  });

  return {
    seqno,
    reference: `seqno:${seqno}`
  };
};
