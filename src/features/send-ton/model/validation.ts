import { toNano } from '@ton/ton';

import { isValidTonAddress, normalizeTonAddress } from '@/entities/wallet';

export type SendFormValues = {
  to: string;
  amountTon: string;
};

export type SendFormErrors = {
  to?: string;
  amountTon?: string;
};

export type SendValidationResult = {
  isValid: boolean;
  errors: SendFormErrors;
  normalizedTo?: string;
};

export const validateSendForm = (
  values: SendFormValues,
  balanceTon: string,
  estimatedFeeTon: number
): SendValidationResult => {
  const errors: SendFormErrors = {};

  if (!values.to.trim()) {
    errors.to = 'Recipient address is required';
  } else if (!isValidTonAddress(values.to.trim())) {
    errors.to = 'Recipient address is invalid';
  }

  const amount = Number(values.amountTon);

  if (!values.amountTon.trim()) {
    errors.amountTon = 'Amount is required';
  } else if (!Number.isFinite(amount)) {
    errors.amountTon = 'Amount must be a valid number';
  } else if (amount <= 0) {
    errors.amountTon = 'Amount must be greater than zero';
  } else {
    const balance = Number(balanceTon);
    const total = amount + estimatedFeeTon;

    if (total > balance) {
      errors.amountTon = `Insufficient balance: requires ${total.toFixed(4)} TON including fee`;
    }

    try {
      toNano(values.amountTon);
    } catch {
      errors.amountTon = 'Amount precision is too high for TON';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: {},
    normalizedTo: normalizeTonAddress(values.to.trim()).urlSafeBounceable
  };
};
