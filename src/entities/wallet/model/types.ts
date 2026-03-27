import type { WalletTransaction } from '@/entities/transaction/model/types';
import type { WalletStreamStatus } from '@/entities/wallet/api/ton-websocket';
import type { AsyncStatus } from '@/shared/lib/types';

export type WalletData = {
  id: string;
  mnemonic: string[];
  publicKeyHex: string;
  addressRaw: string;
  addressFriendly: string;
};

export type WalletCache = {
  knownRecipients: string[];
  transactions: WalletTransaction[];
  balanceTon: string;
};

export type SendTxState = {
  status: AsyncStatus;
  error: string | null;
  txHash?: string;
  reference?: string;
};

export type WalletStoreState = {
  wallets: WalletData[];
  activeWalletId: string | null;
  walletCaches: Record<string, WalletCache>;
  wallet: WalletData | null;
  knownRecipients: string[];
  balanceTon: string;
  balanceStatus: AsyncStatus;
  balanceError: string | null;
  transactions: WalletTransaction[];
  transactionsStatus: AsyncStatus;
  transactionsError: string | null;
  streamStatus: WalletStreamStatus;
  sendState: SendTxState;
  activateWalletByMnemonic: (mnemonic: string[]) => Promise<void>;
  switchActiveWallet: (walletId: string) => Promise<void>;
  clearWallet: () => void;
  refreshBalance: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshWalletData: () => Promise<void>;
  sendTon: (input: { to: string; amountTon: string; comment?: string }) => Promise<{ txHash?: string; reference?: string }>;
  setStreamStatus: (status: WalletStreamStatus) => void;
  resetSendState: () => void;
};
