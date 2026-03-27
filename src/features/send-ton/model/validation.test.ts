import { describe, expect, it } from 'vitest';

import { validateSendForm } from './validation';

const VALID_RAW = '0:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('validateSendForm', () => {
  it('checks required fields', () => {
    const result = validateSendForm({ to: '', amountTon: '' }, '1', 0.03);

    expect(result.isValid).toBe(false);
    expect(result.errors.to).toBeDefined();
    expect(result.errors.amountTon).toBeDefined();
  });

  it('rejects invalid address format', () => {
    const result = validateSendForm({ to: 'invalid', amountTon: '1' }, '5', 0.03);

    expect(result.isValid).toBe(false);
    expect(result.errors.to).toContain('invalid');
  });

  it('checks amount against balance + fee', () => {
    const result = validateSendForm({ to: VALID_RAW, amountTon: '1.99' }, '2', 0.03);

    expect(result.isValid).toBe(false);
    expect(result.errors.amountTon).toContain('Insufficient');
  });

  it('returns normalized recipient for valid payload', () => {
    const result = validateSendForm({ to: VALID_RAW, amountTon: '1.5' }, '5', 0.03);

    expect(result.isValid).toBe(true);
    expect(result.normalizedTo).toBeDefined();
  });
});
