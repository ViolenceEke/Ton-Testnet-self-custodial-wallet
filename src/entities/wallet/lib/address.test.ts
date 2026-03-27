import { describe, expect, it } from 'vitest';

import { areSameTonAddress, isSimilarTonAddress, isValidTonAddress, normalizeTonAddress } from './address';

const RAW_A = '0:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const RAW_B = '0:0123456789abcdefffffffffffffffffeeeeeeeeeeeeeeee0123456789abcdef';

describe('TON address helpers', () => {
  it('normalizes address into multiple canonical formats', () => {
    const normalized = normalizeTonAddress(RAW_A);

    expect(normalized.raw).toBe(RAW_A);
    expect(normalized.urlSafeBounceable.length).toBeGreaterThan(10);
    expect(normalized.nonBounceable.length).toBeGreaterThan(10);
  });

  it('compares friendly and raw addresses canonically', () => {
    const friendly = normalizeTonAddress(RAW_A).urlSafeBounceable;

    expect(areSameTonAddress(RAW_A, friendly)).toBe(true);
  });

  it('validates format and catches invalid values', () => {
    expect(isValidTonAddress(RAW_A)).toBe(true);
    expect(isValidTonAddress('not-an-address')).toBe(false);
  });

  it('detects similar-looking canonical addresses', () => {
    expect(isSimilarTonAddress(RAW_B, RAW_A)).toBe(true);
  });
});
