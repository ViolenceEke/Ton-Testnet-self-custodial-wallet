export type WalletTransactionDirection = 'in' | 'out' | 'unknown';

export type WalletTransaction = {
  id: string;
  hash: string;
  lt: string;
  timestamp: number;
  from: string;
  to: string;
  amountNano: string;
  amountTon: string;
  direction: WalletTransactionDirection;
  status: 'pending' | 'confirmed' | 'failed';
  description: string;
  explorerUrl?: string;
};
