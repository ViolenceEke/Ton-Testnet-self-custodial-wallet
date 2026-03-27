import { isSimilarTonAddress, normalizeTonAddress } from '@/entities/wallet';
import { LARGE_TRANSFER_THRESHOLD_TON } from '@/shared/config/constants';

export type RiskCheckResult = {
  warnings: string[];
  isRisky: boolean;
  isNewAddress: boolean;
  similarToAddress?: string;
  requiresLargeTransferConfirmation: boolean;
  addressSuffixToConfirm?: string;
};

export const evaluateSendRisks = (params: {
  toAddress: string;
  amountTon: string;
  knownAddresses: string[];
}): RiskCheckResult => {
  const normalizedTo = normalizeTonAddress(params.toAddress);
  const knownRawAddresses = Array.from(
    new Set(
      params.knownAddresses
        .map((address) => {
          try {
            return normalizeTonAddress(address).raw;
          } catch {
            return null;
          }
        })
        .filter((address): address is string => Boolean(address))
    )
  );

  const warnings: string[] = [];
  const isNewAddress = !knownRawAddresses.includes(normalizedTo.raw);

  if (isNewAddress) {
    warnings.push('This recipient is new and has not appeared in your local history/address book.');
  }

  const similarAddress = knownRawAddresses.find((knownAddress) =>
    isSimilarTonAddress(normalizedTo.raw, knownAddress)
  );

  if (similarAddress) {
    warnings.push(
      'Recipient looks visually similar to a known address. Verify full address to prevent substitution.'
    );
  }

  const amount = Number(params.amountTon);
  const requiresLargeTransferConfirmation = Number.isFinite(amount) && amount >= LARGE_TRANSFER_THRESHOLD_TON;

  if (requiresLargeTransferConfirmation) {
    warnings.push(
      `Large transfer detected (>= ${LARGE_TRANSFER_THRESHOLD_TON} TON). Additional confirmation is required.`
    );
  }

  return {
    warnings,
    isRisky: warnings.length > 0,
    isNewAddress,
    similarToAddress: similarAddress,
    requiresLargeTransferConfirmation,
    addressSuffixToConfirm: requiresLargeTransferConfirmation
      ? normalizedTo.urlSafeBounceable.slice(-4)
      : undefined
  };
};
