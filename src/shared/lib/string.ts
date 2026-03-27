export const toSentenceCase = (value: string): string => {
  if (!value.length) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};
