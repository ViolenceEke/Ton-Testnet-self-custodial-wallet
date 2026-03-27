import type { WalletTransaction } from '@/entities/transaction/model/types';
import { formatDateTime, shortenAddress } from '@/shared/lib/format';
import { Alert, Badge, Button, Card } from '@/shared/ui';

type TransactionListWidgetProps = {
  transactions: WalletTransaction[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  onRetry: () => void;
};

const isWalletSignedMessageTx = (transaction: WalletTransaction): boolean => {
  return (
    transaction.direction === 'in' &&
    transaction.from === 'Unknown' &&
    transaction.amountNano === '0'
  );
};

const getTransactionTitle = (transaction: WalletTransaction): string => {
  if (isWalletSignedMessageTx(transaction)) {
    return 'Wallet operation (signed message)';
  }

  return `${transaction.direction === 'out' ? 'Sent' : 'Received'} ${transaction.amountTon} TON`;
};

const getTransactionBadgeTone = (transaction: WalletTransaction): 'neutral' | 'warning' | 'success' => {
  if (isWalletSignedMessageTx(transaction)) {
    return 'neutral';
  }

  return transaction.direction === 'out' ? 'warning' : 'success';
};

export const TransactionListWidget = ({
  transactions,
  status,
  error,
  onRetry
}: TransactionListWidgetProps): JSX.Element => {
  return (
    <Card title="Recent Transactions">
      {status === 'error' ? (
        <Alert tone="error" title="Unable to load transactions">
          {error}
        </Alert>
      ) : null}

      {status === 'error' ? (
        <Button variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}

      {status !== 'loading' && transactions.length === 0 ? (
        <Alert tone="info">No transactions yet on this wallet.</Alert>
      ) : null}

      {transactions.length > 0 ? (
        <ul className="tx-list">
          {transactions.map((transaction) => (
            <li key={transaction.id} className="tx-item">
              <div className="tx-head">
                <strong>{getTransactionTitle(transaction)}</strong>
                <Badge tone={getTransactionBadgeTone(transaction)}>
                  {transaction.direction.toUpperCase()}
                </Badge>
              </div>
              <p className="tx-meta">
                From: {shortenAddress(transaction.from)} | To: {shortenAddress(transaction.to)}
              </p>
              <p className="tx-meta">Hash: {shortenAddress(transaction.hash, 8, 8)}</p>
              <p className="tx-meta">{formatDateTime(transaction.timestamp)}</p>
              {transaction.explorerUrl ? (
                <a className="tx-link" href={transaction.explorerUrl} target="_blank" rel="noreferrer">
                  Open in explorer
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
};
