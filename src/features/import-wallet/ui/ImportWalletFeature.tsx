import { useState } from 'react';

import { useWalletStore } from '@/entities/wallet';
import { parseSeedPhrase, validateSeedPhrase } from '@/entities/wallet/lib/wallet-factory';
import { Alert, Button, Card } from '@/shared/ui';

type ImportWalletFeatureProps = {
  onComplete: () => void;
};

export const ImportWalletFeature = ({ onComplete }: ImportWalletFeatureProps): JSX.Element => {
  const activateWalletByMnemonic = useWalletStore((state) => state.activateWalletByMnemonic);

  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async (): Promise<void> => {
    setError(null);

    const words = parseSeedPhrase(phrase);
    const isValid = await validateSeedPhrase(words);

    if (!isValid) {
      setError('Invalid seed phrase. Expected valid 24 words.');
      return;
    }

    setLoading(true);

    try {
      await activateWalletByMnemonic(words);
      onComplete();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to import wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="Import Existing Wallet"
      subtitle="Paste your 24-word seed phrase. Phrase is stored locally in browser storage for this MVP."
    >
      <label className="field" htmlFor="seed-phrase">
        <span className="field-label">Seed phrase</span>
        <textarea
          id="seed-phrase"
          className="textarea"
          rows={5}
          placeholder="word1 word2 ... word24"
          value={phrase}
          onChange={(event) => setPhrase(event.target.value)}
        />
      </label>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button onClick={handleImport} loading={loading} fullWidth>
        Import Wallet
      </Button>
    </Card>
  );
};
