import { useWalletStore } from '@/entities/wallet';
import { formatTonAmount, shortenAddress } from '@/shared/lib/format';
import { Alert, Badge, Button, Card } from '@/shared/ui';

export const WalletSummaryWidget = (): JSX.Element => {
  const wallet = useWalletStore((state) => state.wallet);
  const balanceTon = useWalletStore((state) => state.balanceTon);
  const balanceStatus = useWalletStore((state) => state.balanceStatus);
  const balanceError = useWalletStore((state) => state.balanceError);
  const refreshWalletData = useWalletStore((state) => state.refreshWalletData);

  if (!wallet) {
    return (
      <Alert tone="warning" title="No wallet selected">
        Create or import wallet from onboarding.
      </Alert>
    );
  }

  return (
    <Card title="Wallet" subtitle="TON testnet self-custodial account">
      <div className="stack-sm">
        <p>
          <strong>Address:</strong> <span className="address-text">{shortenAddress(wallet.addressFriendly)}</span>
        </p>
        <p>
          <strong>Balance:</strong> <span>{formatTonAmount(balanceTon)} TON</span>
        </p>
        <Badge tone="neutral">Testnet</Badge>
      </div>

      {balanceStatus === 'error' ? (
        <Alert tone="error" title="Unable to load balance">
          {balanceError}
        </Alert>
      ) : null}
      <Button variant="secondary" onClick={() => void refreshWalletData()}>
        Refresh
      </Button>
    </Card>
  );
};
