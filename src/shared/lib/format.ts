export const shortenAddress = (value: string, start = 6, end = 6): string => {
  if (!value) {
    return '';
  }

  if (value.length <= start + end + 3) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
};

export const formatTonAmount = (value: string | number, fractionDigits = 4): string => {
  const numericValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return '0';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits
  }).format(numericValue);
};

export const formatDateTime = (value: number): string => {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
};
