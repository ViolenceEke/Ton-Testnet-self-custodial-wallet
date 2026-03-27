import { useState } from 'react';

import { useWalletStore } from '@/entities/wallet';
import { showToast } from '@/shared/lib/toast';
import { Alert, Button, Card } from '@/shared/ui';

export const ReceiveTonFeature = (): JSX.Element => {
  const wallet = useWalletStore((state) => state.wallet);
  const [copied, setCopied] = useState(false);

  if (!wallet) {
    return (
      <Alert tone="error" title="Wallet not ready">
        Create or import wallet first.
      </Alert>
    );
  }

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(wallet.addressFriendly);
      setCopied(true);
      showToast({ tone: 'success', title: 'Address copied' });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast({
        tone: 'error',
        title: 'Copy failed',
        text: 'Clipboard permission is not available in this browser context.'
      });
    }
  };

  return (
    <Card title="Receive TON" subtitle="Share this address to receive TON on testnet.">
      <p className="address-text">{wallet.addressFriendly}</p>
      <div className="actions-row">
        <Button onClick={handleCopy}>Copy address</Button>
        {copied ? <span className="copied-text">Copied</span> : null}
      </div>
    </Card>
  );
};
