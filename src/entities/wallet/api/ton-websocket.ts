import {
  TON_TESTNET_WS_ENDPOINT,
  TONCENTER_STREAM_MIN_FINALITY,
  TONCENTER_STREAM_TOKEN,
  TONCENTER_STREAM_TOKEN_PARAM
} from '@/shared/config/constants';

import { normalizeTonAddress } from '../lib/address';

export type WalletStreamStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export type WalletStreamFinality = 'pending' | 'confirmed' | 'finalized' | 'trace_invalidated';

type SubscribeWalletTransactionsParams = {
  accountRaw: string;
  onTransaction: (event: { txHash: string; lt: string; finality: WalletStreamFinality }) => void;
  onStatusChange?: (status: WalletStreamStatus) => void;
  onError?: (errorMessage: string) => void;
};

const MAX_RECONNECT_ATTEMPTS = 3;
const KEEPALIVE_INTERVAL_MS = 15_000;

const normalizeRawSafely = (value: string): string => {
  try {
    return normalizeTonAddress(value).raw;
  } catch {
    return value;
  }
};

const resolveTokenParamName = (): 'token' | 'api_key' => {
  const normalized = TONCENTER_STREAM_TOKEN_PARAM.trim().toLowerCase();
  return normalized === 'api_key' ? 'api_key' : 'token';
};

const buildStreamUrl = (): string => {
  const url = new URL(TON_TESTNET_WS_ENDPOINT);

  if (TONCENTER_STREAM_TOKEN.trim()) {
    url.searchParams.set(resolveTokenParamName(), TONCENTER_STREAM_TOKEN.trim());
  }

  return url.toString();
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as Record<string, unknown>;
};

const asRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item));
};

const resolveTransactionItem = (payload: Record<string, unknown>): Record<string, unknown> | null => {
  const transactions = asRecordArray(payload.transactions);
  if (transactions.length > 0) {
    return transactions[0];
  }

  return asRecord(payload.transaction);
};

const resolveStatus = (payload: Record<string, unknown>): WalletStreamFinality | null => {
  const candidate =
    payload.finality ??
    payload.status ??
    asRecord(payload.event)?.finality ??
    asRecord(payload.event)?.status ??
    asRecord(payload.params)?.finality ??
    asRecord(payload.params)?.status;

  if (candidate === 'pending' || candidate === 'confirmed' || candidate === 'finalized' || candidate === 'trace_invalidated') {
    return candidate;
  }

  return null;
};

const resolveAccount = (payload: Record<string, unknown>): string => {
  const transaction = resolveTransactionItem(payload);

  return String(
    payload.account_id ??
      payload.account ??
      payload.address ??
      transaction?.account ??
      transaction?.address ??
      asRecord(payload.event)?.account_id ??
      asRecord(payload.event)?.account ??
      asRecord(payload.params)?.account_id ??
      asRecord(payload.params)?.account ??
      ''
  );
};

const resolveTxHash = (payload: Record<string, unknown>): string => {
  const transaction = resolveTransactionItem(payload);

  return String(
    payload.tx_hash ??
      payload.transaction_hash ??
      payload.hash ??
      transaction?.hash ??
      asRecord(payload.event)?.tx_hash ??
      asRecord(payload.event)?.transaction_hash ??
      asRecord(payload.event)?.hash ??
      asRecord(payload.params)?.tx_hash ??
      asRecord(payload.params)?.transaction_hash ??
      asRecord(payload.params)?.hash ??
      ''
  );
};

const resolveLt = (payload: Record<string, unknown>): string => {
  const transaction = resolveTransactionItem(payload);
  return String(payload.lt ?? transaction?.lt ?? asRecord(payload.event)?.lt ?? asRecord(payload.params)?.lt ?? '');
};

export const subscribeWalletTransactions = ({
  accountRaw,
  onTransaction,
  onStatusChange,
  onError
}: SubscribeWalletTransactionsParams): (() => void) => {
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let keepaliveTimer: number | null = null;
  let reconnectAttempt = 0;
  let isStopped = false;

  const targetAccountRaw = normalizeRawSafely(accountRaw);

  const clearReconnectTimer = (): void => {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const clearKeepaliveTimer = (): void => {
    if (keepaliveTimer !== null) {
      window.clearInterval(keepaliveTimer);
      keepaliveTimer = null;
    }
  };

  const setStatus = (status: WalletStreamStatus): void => {
    onStatusChange?.(status);
  };

  const startKeepalive = (): void => {
    clearKeepaliveTimer();

    keepaliveTimer = window.setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ operation: 'ping' }));
      }
    }, KEEPALIVE_INTERVAL_MS);
  };

  const scheduleReconnect = (): void => {
    if (isStopped) {
      return;
    }

    if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      setStatus('disconnected');
      onError?.('WebSocket unavailable, switched to polling fallback');
      return;
    }

    clearReconnectTimer();
    reconnectAttempt += 1;

    const delay = Math.min(30_000, 1_000 * 2 ** Math.min(reconnectAttempt, 5));
    setStatus('reconnecting');

    reconnectTimer = window.setTimeout(() => {
      connect();
    }, delay);
  };

  const connect = (): void => {
    if (isStopped) {
      return;
    }

    setStatus(reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

    socket = new WebSocket(buildStreamUrl());

    socket.onopen = () => {
      setStatus('connected');
      startKeepalive();

      socket?.send(
        JSON.stringify({
          operation: 'subscribe',
          types: ['transactions'],
          addresses: [targetAccountRaw],
          min_finality: TONCENTER_STREAM_MIN_FINALITY
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const eventData = String(event.data);

        if (eventData === 'pong' || eventData === 'ping' || eventData === ': keepalive') {
          return;
        }

        const payload = JSON.parse(eventData);
        const record = asRecord(payload);

        if (!record) {
          return;
        }

        if ('error' in record) {
          onError?.(String(record.error));
          return;
        }

        const finality = resolveStatus(record);
        if (!finality) {
          return;
        }

        const accountId = normalizeRawSafely(resolveAccount(record));
        if (accountId && accountId !== targetAccountRaw) {
          return;
        }

        const txHash = resolveTxHash(record);
        const lt = resolveLt(record);

        onTransaction({ txHash, lt, finality });
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'WebSocket message parse error');
      }
    };

    socket.onerror = () => {
      setStatus('error');
    };

    socket.onclose = (event) => {
      clearKeepaliveTimer();

      if (isStopped) {
        setStatus('disconnected');
        return;
      }

      if (event.reason) {
        onError?.(event.reason);
      }

      scheduleReconnect();
    };
  };

  connect();

  return () => {
    isStopped = true;
    clearReconnectTimer();
    clearKeepaliveTimer();

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close(1000, 'Manual disconnect');
    } else {
      socket?.close();
    }

    setStatus('disconnected');
  };
};
