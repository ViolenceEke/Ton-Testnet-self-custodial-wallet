import { useEffect, useMemo, useRef, useState } from 'react';

import { useWalletStore, type WalletStreamStatus } from '@/entities/wallet';
import { SearchTransactionsFeature } from '@/features/search-transactions';
import { closeLoadingToast, showLoadingToast } from '@/shared/lib/toast';
import { TransactionListWidget } from '@/widgets/transaction-list';
import { WalletSummaryWidget } from '@/widgets/wallet-summary';

const getRealtimeStatusLabel = (status: WalletStreamStatus): string => {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting...';
    case 'reconnecting':
      return 'Reconnecting...';
    case 'error':
      return 'Connection error';
    default:
      return 'Disconnected';
  }
};

export const HomePage = (): JSX.Element => {
  const refreshWalletData = useWalletStore((state) => state.refreshWalletData);
  const transactions = useWalletStore((state) => state.transactions);
  const status = useWalletStore((state) => state.transactionsStatus);
  const error = useWalletStore((state) => state.transactionsError);
  const balanceStatus = useWalletStore((state) => state.balanceStatus);
  const streamStatus = useWalletStore((state) => state.streamStatus);

  const [query, setQuery] = useState('');
  const loadingToastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === 'idle') {
      void refreshWalletData();
    }
  }, [refreshWalletData, status]);

  useEffect(() => {
    const isLoading = status === 'loading' || balanceStatus === 'loading';

    if (isLoading) {
      if (loadingToastTimerRef.current === null) {
        loadingToastTimerRef.current = window.setTimeout(() => {
          showLoadingToast('Updating wallet data', 'Refreshing balance and transactions.');
          loadingToastTimerRef.current = null;
        }, 280);
      }

      return;
    }

    if (loadingToastTimerRef.current !== null) {
      window.clearTimeout(loadingToastTimerRef.current);
      loadingToastTimerRef.current = null;
    }

    closeLoadingToast();
  }, [balanceStatus, status]);

  useEffect(() => {
    return () => {
      if (loadingToastTimerRef.current !== null) {
        window.clearTimeout(loadingToastTimerRef.current);
      }

      closeLoadingToast();
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    if (!query.trim()) {
      return transactions;
    }

    const normalizedQuery = query.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const serialized = [
        transaction.hash,
        transaction.from,
        transaction.to,
        transaction.amountTon,
        transaction.direction,
        transaction.description
      ]
        .join(' ')
        .toLowerCase();

      return serialized.includes(normalizedQuery);
    });
  }, [query, transactions]);

  return (
    <div className="page stack-md">
      <WalletSummaryWidget />
      <p className="muted-text">
        Realtime updates: <strong>{getRealtimeStatusLabel(streamStatus)}</strong>.
        {streamStatus !== 'connected' ? ' Fallback polling is active.' : ''}
      </p>
      <SearchTransactionsFeature query={query} onChange={setQuery} />
      <TransactionListWidget
        transactions={filteredTransactions}
        status={status}
        error={error}
        onRetry={() => void refreshWalletData()}
      />
    </div>
  );
};
