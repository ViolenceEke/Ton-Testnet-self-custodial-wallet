import { mnemonicNew, mnemonicToPrivateKey, mnemonicValidate } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';

import { normalizeTonAddress } from './address';

export type WalletIdentity = {
  mnemonic: string[];
  publicKeyHex: string;
  addressRaw: string;
  addressFriendly: string;
};

export const generateSeedPhrase = async (): Promise<string[]> => {
  return mnemonicNew(24);
};

export const validateSeedPhrase = async (phrase: string[]): Promise<boolean> => {
  if (phrase.length !== 24 || phrase.some((word) => !word.trim())) {
    return false;
  }

  return mnemonicValidate(phrase.map((word) => word.trim().toLowerCase()));
};

export const deriveWalletFromMnemonic = async (mnemonic: string[]): Promise<WalletIdentity> => {
  const normalizedMnemonic = mnemonic.map((word) => word.trim().toLowerCase());
  const isValid = await validateSeedPhrase(normalizedMnemonic);

  if (!isValid) {
    throw new Error('Invalid seed phrase');
  }

  const keyPair = await mnemonicToPrivateKey(normalizedMnemonic);
  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey
  });

  const normalized = normalizeTonAddress(wallet.address.toString());

  return {
    mnemonic: normalizedMnemonic,
    publicKeyHex: Buffer.from(keyPair.publicKey).toString('hex'),
    addressRaw: normalized.raw,
    addressFriendly: normalized.urlSafeBounceable
  };
};

export const parseSeedPhrase = (value: string): string[] => {
  return value
    .split(/\s+/)
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);
};
