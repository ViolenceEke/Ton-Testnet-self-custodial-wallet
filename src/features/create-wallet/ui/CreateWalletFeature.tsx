import { useMemo, useState } from 'react';

import { useWalletStore } from '@/entities/wallet';
import { generateSeedPhrase } from '@/entities/wallet/lib/wallet-factory';
import { Alert, Button, Card, Input } from '@/shared/ui';

type CreateWalletFeatureProps = {
  onComplete: () => void;
};

const getRandomIndexes = (size: number): number[] => {
  const source = Array.from({ length: size }, (_, index) => index);

  for (let i = source.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [source[i], source[j]] = [source[j], source[i]];
  }

  return source.slice(0, 3).sort((left, right) => left - right);
};

export const CreateWalletFeature = ({ onComplete }: CreateWalletFeatureProps): JSX.Element => {
  const activateWalletByMnemonic = useWalletStore((state) => state.activateWalletByMnemonic);

  const [seedPhrase, setSeedPhrase] = useState<string[] | null>(null);
  const [verificationWords, setVerificationWords] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const indexesToVerify = useMemo(() => {
    if (!seedPhrase) {
      return [];
    }

    return getRandomIndexes(seedPhrase.length);
  }, [seedPhrase]);

  const handleGenerate = async (): Promise<void> => {
    setError(null);
    const nextSeed = await generateSeedPhrase();
    setSeedPhrase(nextSeed);
    setVerificationWords({});
  };

  const handleVerifyAndContinue = async (): Promise<void> => {
    if (!seedPhrase) {
      return;
    }

    const isValid = indexesToVerify.every(
      (index) => verificationWords[index]?.trim().toLowerCase() === seedPhrase[index]
    );

    if (!isValid) {
      setError('Seed phrase verification failed. Please recheck selected words.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await activateWalletByMnemonic(seedPhrase);
      onComplete();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to initialize wallet');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      title="Create New Wallet"
      subtitle="Generate a fresh TON testnet wallet and confirm your seed phrase before access."
    >
      {!seedPhrase ? (
        <Button onClick={handleGenerate}>Generate seed phrase</Button>
      ) : (
        <div className="stack-md">
          <Alert tone="warning" title="Backup required">
            Save this 24-word seed phrase offline. Anyone with this phrase can control your funds.
          </Alert>
          <div className="seed-grid" aria-label="seed phrase">
            {seedPhrase.map((word, index) => (
              <span key={word + index} className="seed-word">
                {index + 1}. {word}
              </span>
            ))}
          </div>
          <p className="muted-text">Verify selected words to continue:</p>
          <div className="stack-sm">
            {indexesToVerify.map((index) => (
              <Input
                key={index}
                label={`Word #${index + 1}`}
                value={verificationWords[index] ?? ''}
                onChange={(event) =>
                  setVerificationWords((prev) => ({
                    ...prev,
                    [index]: event.target.value.trim().toLowerCase()
                  }))
                }
                autoComplete="off"
                spellCheck={false}
              />
            ))}
          </div>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="actions-row">
            <Button variant="secondary" onClick={handleGenerate} disabled={submitting}>
              Regenerate
            </Button>
            <Button onClick={handleVerifyAndContinue} loading={submitting}>
              Verify and Continue
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
