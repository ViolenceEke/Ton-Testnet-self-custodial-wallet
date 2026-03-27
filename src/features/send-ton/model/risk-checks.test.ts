import { describe, expect, it } from 'vitest';

import { evaluateSendRisks } from './risk-checks';

const RAW_KNOWN = '0:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const RAW_SIMILAR = '0:0123456789abcdefffffffffffffffffeeeeeeeeeeeeeeee0123456789abcdef';
const RAW_NEW = '0:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('evaluateSendRisks', () => {
  it('flags a brand new recipient as risky', () => {
    const result = evaluateSendRisks({
      toAddress: RAW_NEW,
      amountTon: '1',
      knownAddresses: [RAW_KNOWN]
    });

    expect(result.isRisky).toBe(true);
    expect(result.isNewAddress).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('does not flag known recipient with small amount', () => {
    const result = evaluateSendRisks({
      toAddress: RAW_KNOWN,
      amountTon: '0.5',
      knownAddresses: [RAW_KNOWN]
    });

    expect(result.isRisky).toBe(false);
    expect(result.warnings).toHaveLength(0);
    expect(result.requiresLargeTransferConfirmation).toBe(false);
  });

  it('flags similar address and large transfer for explicit confirmation', () => {
    const result = evaluateSendRisks({
      toAddress: RAW_SIMILAR,
      amountTon: '30',
      knownAddresses: [RAW_KNOWN]
    });

    expect(result.isRisky).toBe(true);
    expect(result.similarToAddress).toBeTruthy();
    expect(result.requiresLargeTransferConfirmation).toBe(true);
    expect(result.addressSuffixToConfirm).toHaveLength(4);
  });
});
