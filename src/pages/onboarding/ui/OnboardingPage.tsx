import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useWalletStore } from '@/entities/wallet';
import { CreateWalletFeature } from '@/features/create-wallet';
import { ImportWalletFeature } from '@/features/import-wallet';

export const OnboardingPage = (): JSX.Element => {
  const navigate = useNavigate();
  const wallets = useWalletStore((state) => state.wallets);
  const [mode, setMode] = useState<'create' | 'import'>('create');

  return (
    <div className="page page-narrow">
      <header className="page-header">
        <h1>{wallets.length > 0 ? 'Add Wallet' : 'TON Testnet Wallet'}</h1>
        <p className="muted-text">
          {wallets.length > 0
            ? `You currently have ${wallets.length} wallet${wallets.length > 1 ? 's' : ''}. Add another or import existing.`
            : 'Self-custodial MVP without backend.'}
        </p>
      </header>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${mode === 'create' ? 'tab-active' : ''}`}
          onClick={() => setMode('create')}
        >
          Create New Wallet
        </button>
        <button
          type="button"
          className={`tab ${mode === 'import' ? 'tab-active' : ''}`}
          onClick={() => setMode('import')}
        >
          Import Wallet
        </button>
      </div>

      {mode === 'create' ? (
        <CreateWalletFeature onComplete={() => navigate('/home')} />
      ) : (
        <ImportWalletFeature onComplete={() => navigate('/home')} />
      )}
    </div>
  );
};
