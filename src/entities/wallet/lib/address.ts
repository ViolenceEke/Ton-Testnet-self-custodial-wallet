import { Address } from '@ton/ton';

export type NormalizedTonAddress = {
  raw: string;
  bounceable: string;
  nonBounceable: string;
  urlSafeBounceable: string;
};

export const normalizeTonAddress = (value: string): NormalizedTonAddress => {
  const parsed = Address.parse(value.trim());

  return {
    raw: parsed.toRawString(),
    bounceable: parsed.toString({ bounceable: true, testOnly: true }),
    nonBounceable: parsed.toString({ bounceable: false, testOnly: true }),
    urlSafeBounceable: parsed.toString({ bounceable: true, testOnly: true, urlSafe: true })
  };
};

export const isValidTonAddress = (value: string): boolean => {
  try {
    normalizeTonAddress(value);
    return true;
  } catch {
    return false;
  }
};

export const areSameTonAddress = (left: string, right: string): boolean => {
  try {
    return normalizeTonAddress(left).raw === normalizeTonAddress(right).raw;
  } catch {
    return false;
  }
};

export const isSimilarTonAddress = (candidate: string, known: string): boolean => {
  try {
    const candidateNormalized = normalizeTonAddress(candidate).raw.replace(':', '');
    const knownNormalized = normalizeTonAddress(known).raw.replace(':', '');

    if (candidateNormalized === knownNormalized) {
      return false;
    }

    const prefix = 10;
    const suffix = 10;

    const samePrefix = candidateNormalized.slice(0, prefix) === knownNormalized.slice(0, prefix);
    const sameSuffix = candidateNormalized.slice(-suffix) === knownNormalized.slice(-suffix);

    return samePrefix && sameSuffix;
  } catch {
    return false;
  }
};
