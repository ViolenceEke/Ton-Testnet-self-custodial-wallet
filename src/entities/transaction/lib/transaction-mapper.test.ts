import { Address } from '@ton/ton';
import { describe, expect, it } from 'vitest';

import { mapTonTransaction } from './transaction-mapper';

const OWN_ADDRESS = '0:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('mapTonTransaction hash resolution', () => {
  it('resolves hash when raw hash is a function', () => {
    const raw = {
      hash: () => Buffer.from('11'.repeat(32), 'hex'),
      lt: '123',
      now: 1_700_000_000,
      inMessage: {
        info: {
          src: '0:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          dest: OWN_ADDRESS,
          value: {
            coins: 2_000_000_000n
          }
        }
      },
      outMessages: []
    };

    const mapped = mapTonTransaction(raw, OWN_ADDRESS);

    expect(mapped.hash).toBe('11'.repeat(32));
    expect(mapped.hash.includes('=>')).toBe(false);
  });

  it('maps ext-in wallet signed transaction as outgoing when out message sends value', () => {
    const ownFriendly = Address.parse(OWN_ADDRESS).toString({ bounceable: true, testOnly: true, urlSafe: true });
    const recipientRaw = '0:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const recipientFriendly = Address.parse(recipientRaw).toString({
      bounceable: true,
      testOnly: true,
      urlSafe: true
    });

    const raw = {
      hash: () => Buffer.from('22'.repeat(32), 'hex'),
      lt: '124',
      now: 1_700_000_100,
      inMessage: {
        info: {
          src: 'External',
          dest: ownFriendly,
          value: {
            coins: 0n
          }
        }
      },
      outMessages: [
        {
          info: {
            src: ownFriendly,
            dest: recipientFriendly,
            value: {
              coins: 2_000_000_000n
            }
          }
        }
      ]
    };

    const mapped = mapTonTransaction(raw, OWN_ADDRESS);

    expect(mapped.direction).toBe('out');
    expect(mapped.to).toBe(recipientRaw);
    expect(mapped.amountNano).toBe('2000000000');
  });
});
