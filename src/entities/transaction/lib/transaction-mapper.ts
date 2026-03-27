import { Address, fromNano } from '@ton/ton';

import { TON_EXPLORER_TX_BASE } from '@/shared/config/constants';
import { formatTonAmount } from '@/shared/lib/format';

import type { WalletTransaction } from '../model/types';

const safeAddress = (value: unknown): string => {
  const normalize = (input: string): string => {
    try {
      return Address.parse(input).toRawString();
    } catch {
      return input;
    }
  };

  if (typeof value === 'string') {
    return normalize(value);
  }

  if (value && typeof value === 'object' && 'toString' in value && typeof value.toString === 'function') {
    return normalize(value.toString());
  }

  return 'Unknown';
};

const sameAddress = (left: string, right: string): boolean => {
  if (!left || !right || left === 'Unknown' || right === 'Unknown') {
    return false;
  }

  try {
    return Address.parse(left).toRawString() === Address.parse(right).toRawString();
  } catch {
    return false;
  }
};

const tryToHexHash = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return Buffer.from(value).toString('hex');
  }

  if (typeof value === 'string') {
    const normalized = value.trim();

    if (/^[a-fA-F0-9]{64}$/.test(normalized)) {
      return normalized.toLowerCase();
    }

    try {
      const decoded = Buffer.from(normalized, 'base64');
      if (decoded.length > 0) {
        return decoded.toString('hex');
      }
    } catch {
      return normalized;
    }

    return normalized;
  }

  return null;
};

const resolveTxHash = (rawTransaction: any): string => {
  const directHash =
    typeof rawTransaction?.hash === 'function' ? rawTransaction.hash() : rawTransaction?.hash;
  const txIdHash =
    typeof rawTransaction?.transaction_id?.hash === 'function'
      ? rawTransaction.transaction_id.hash()
      : rawTransaction?.transaction_id?.hash;

  const fromDirect = tryToHexHash(directHash);
  if (fromDirect) {
    return fromDirect;
  }

  const fromTxId = tryToHexHash(txIdHash);
  if (fromTxId) {
    return fromTxId;
  }

  return crypto.randomUUID();
};

export const mapTonTransaction = (rawTransaction: any, ownAddressRaw: string): WalletTransaction => {
  const hash = resolveTxHash(rawTransaction);

  const lt = String(rawTransaction?.lt ?? rawTransaction?.transaction_id?.lt ?? '0');
  const timestamp = Number(rawTransaction?.now ?? Math.floor(Date.now() / 1000)) * 1000;

  const inInfo = rawTransaction?.inMessage?.info;
  const inValue = rawTransaction?.inMessage?.info?.value?.coins ?? rawTransaction?.inMessage?.value;
  const inFrom = safeAddress(inInfo?.src);

  const outMessages = rawTransaction?.outMessages?.values
    ? Array.from(rawTransaction.outMessages.values())
    : Array.isArray(rawTransaction?.outMessages)
      ? rawTransaction.outMessages
      : [];

  const outgoingMessage = outMessages.find((message: any) => {
    const info = message?.info;
    const value = info?.value?.coins ?? message?.value ?? 0n;
    const destination = safeAddress(info?.dest);

    return BigInt(value) > 0n && !sameAddress(destination, ownAddressRaw);
  });

  const firstOutInfo = outMessages[0]?.info;
  const outInfo = outgoingMessage?.info ?? firstOutInfo;
  const outTo = safeAddress(outInfo?.dest);
  const outFrom = safeAddress(outInfo?.src);
  const outValue = outInfo?.value?.coins ?? outgoingMessage?.value ?? outMessages[0]?.value;

  const hasOutgoingMessage = Boolean(outgoingMessage);
  const isOutgoing = hasOutgoingMessage || sameAddress(inFrom, ownAddressRaw) || sameAddress(outFrom, ownAddressRaw);
  const amountNanoValue = isOutgoing ? outValue : inValue;
  const amountNano = String(amountNanoValue ?? 0n);

  const direction: WalletTransaction['direction'] = isOutgoing ? 'out' : 'in';
  const from = direction === 'out' ? ownAddressRaw : inFrom;
  const to = direction === 'out' ? outTo || 'Unknown' : ownAddressRaw;
  const amountTon = formatTonAmount(fromNano(BigInt(amountNano || '0')));

  return {
    id: `${lt}:${hash}`,
    hash,
    lt,
    timestamp,
    from,
    to,
    amountNano,
    amountTon,
    direction,
    status: 'confirmed',
    description: direction === 'out' ? 'Sent TON' : 'Received TON',
    explorerUrl: `${TON_EXPLORER_TX_BASE}/${hash}`
  };
};
