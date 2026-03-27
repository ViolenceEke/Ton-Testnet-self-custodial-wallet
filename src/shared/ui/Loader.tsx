export const Loader = (): JSX.Element => {
  return (
    <div className="loader-wrap" role="status" aria-live="polite" aria-busy="true" aria-label="Loading">
      <span className="loader" />
    </div>
  );
};
