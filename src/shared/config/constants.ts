export const TON_TESTNET_ENDPOINT =
  import.meta.env.VITE_TON_TESTNET_ENDPOINT ?? 'https://testnet.toncenter.com/api/v2/jsonRPC';

export const TONCENTER_API_KEY =
  import.meta.env.VITE_TONCENTER_API_KEY ??
  import.meta.env.VITE_TON_TESTNET_API_KEY ??
  import.meta.env.VITE_TONCENTER_STREAM_TOKEN ??
  '';

export const TON_TESTNET_API_KEY = TONCENTER_API_KEY;

export const TON_TESTNET_FALLBACK_ENDPOINTS = (import.meta.env.VITE_TON_TESTNET_FALLBACK_ENDPOINTS ?? '')
  .split(',')
  .map((value: string) => value.trim())
  .filter(Boolean);

export const TON_TESTNET_WS_ENDPOINT =
  import.meta.env.VITE_TON_TESTNET_WS_ENDPOINT ?? 'wss://testnet.toncenter.com/api/streaming/v2/ws';

export const TONCENTER_STREAM_TOKEN = TONCENTER_API_KEY;

export const TONCENTER_STREAM_TOKEN_PARAM =
  import.meta.env.VITE_TONCENTER_STREAM_TOKEN_PARAM ?? 'api_key';

export const TONCENTER_STREAM_MIN_FINALITY =
  import.meta.env.VITE_TONCENTER_STREAM_MIN_FINALITY ?? 'pending';

export const ENABLE_WS_STREAM = import.meta.env.VITE_ENABLE_WS_STREAM !== 'false';

export const TON_EXPLORER_TX_BASE =
  import.meta.env.VITE_TON_EXPLORER_TX_BASE ?? 'https://testnet.tonviewer.com/transaction';

export const LARGE_TRANSFER_THRESHOLD_TON = 20;
export const ESTIMATED_FEE_TON = 0.03;
export const TRANSACTIONS_LIMIT = 25;
export const APP_TITLE = 'TON Testnet Wallet';
