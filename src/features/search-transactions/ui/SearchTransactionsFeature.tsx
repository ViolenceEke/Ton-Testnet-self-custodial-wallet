import { Input } from '@/shared/ui';

type SearchTransactionsFeatureProps = {
  query: string;
  onChange: (value: string) => void;
};

export const SearchTransactionsFeature = ({
  query,
  onChange
}: SearchTransactionsFeatureProps): JSX.Element => {
  return (
    <Input
      label="Search transactions"
      placeholder="Search by address, hash, amount, or type"
      value={query}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};
