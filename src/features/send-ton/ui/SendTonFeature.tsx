import { useEffect, useMemo, useRef, useState } from "react";

import {
  areSameTonAddress,
  normalizeTonAddress,
  useWalletStore,
} from "@/entities/wallet";
import { ESTIMATED_FEE_TON } from "@/shared/config/constants";
import { formatTonAmount } from "@/shared/lib/format";
import {
  closeLoadingToast,
  showLoadingToast,
  showToast,
} from "@/shared/lib/toast";
import { Alert, Badge, Button, Card, Input } from "@/shared/ui";

import { evaluateSendRisks } from "../model/risk-checks";
import { validateSendForm } from "../model/validation";

type SendTonFeatureProps = {
  onSent?: () => void;
};

export const SendTonFeature = ({
  onSent,
}: SendTonFeatureProps): JSX.Element => {
  const wallet = useWalletStore((state) => state.wallet);
  const balanceTon = useWalletStore((state) => state.balanceTon);
  const transactions = useWalletStore((state) => state.transactions);
  const knownRecipients = useWalletStore((state) => state.knownRecipients);
  const sendState = useWalletStore((state) => state.sendState);
  const sendTon = useWalletStore((state) => state.sendTon);
  const resetSendState = useWalletStore((state) => state.resetSendState);

  const [recipient, setRecipient] = useState("");
  const [amountTon, setAmountTon] = useState("");
  const [errors, setErrors] = useState<{ to?: string; amountTon?: string }>({});
  const [reviewAddress, setReviewAddress] = useState<string | null>(null);
  const [riskConfirmed, setRiskConfirmed] = useState(false);
  const [largeTransferCode, setLargeTransferCode] = useState("");
  const lastToastStateRef = useRef<string>("idle");

  const knownAddresses = useMemo(() => {
    const fromHistory = transactions.flatMap((transaction) => [
      transaction.from,
      transaction.to,
    ]);

    const all = [...knownRecipients, ...fromHistory].filter(Boolean);

    return Array.from(new Set(all)).filter(
      (address) => !wallet || !areSameTonAddress(address, wallet.addressRaw),
    );
  }, [knownRecipients, transactions, wallet]);

  const riskCheck = useMemo(() => {
    if (!reviewAddress) {
      return null;
    }

    return evaluateSendRisks({
      toAddress: reviewAddress,
      amountTon,
      knownAddresses,
    });
  }, [reviewAddress, amountTon, knownAddresses]);

  useEffect(() => {
    const currentState = `${sendState.status}:${sendState.txHash ?? ""}:${sendState.error ?? ""}`;
    if (lastToastStateRef.current === currentState) {
      return;
    }

    lastToastStateRef.current = currentState;

    if (sendState.status === "loading") {
      showLoadingToast(
        "Submitting transfer",
        "Broadcasting transaction to TON testnet.",
      );
      return;
    }

    closeLoadingToast();

    if (sendState.status === "success") {
      if (sendState.txHash) {
        showToast({
          tone: "success",
          title: "Transfer confirmed",
          text: `Tx hash: ${sendState.txHash.slice(0, 12)}...${sendState.txHash.slice(-8)}`,
        });
        return;
      }

      showToast({
        tone: "info",
        title: "Transfer submitted",
        text: "Waiting for on-chain confirmation and final tx hash.",
      });
      return;
    }

    if (sendState.status === "error") {
      showToast({
        tone: "error",
        title: "Transfer failed",
        text: sendState.error ?? "Unknown error",
      });
    }

    if (sendState.status === "idle") {
      closeLoadingToast();
    }
  }, [sendState.error, sendState.status, sendState.txHash]);

  useEffect(() => {
    return () => {
      closeLoadingToast();
    };
  }, []);

  if (!wallet) {
    return (
      <Alert tone="error" title="Wallet not ready">
        Create or import wallet first.
      </Alert>
    );
  }

  const handlePrepareReview = (): void => {
    resetSendState();

    const validation = validateSendForm(
      { to: recipient, amountTon },
      balanceTon,
      ESTIMATED_FEE_TON,
    );

    if (!validation.isValid || !validation.normalizedTo) {
      setErrors(validation.errors);
      setReviewAddress(null);
      return;
    }

    setErrors({});
    setReviewAddress(validation.normalizedTo);
    setRiskConfirmed(false);
    setLargeTransferCode("");
  };

  const handleConfirmSend = async (): Promise<void> => {
    if (!reviewAddress) {
      return;
    }

    if (riskCheck?.isRisky && !riskConfirmed) {
      return;
    }

    if (
      riskCheck?.requiresLargeTransferConfirmation &&
      riskCheck.addressSuffixToConfirm &&
      largeTransferCode !== riskCheck.addressSuffixToConfirm
    ) {
      return;
    }

    try {
      await sendTon({ to: reviewAddress, amountTon });
      setRecipient("");
      setAmountTon("");
      setReviewAddress(null);
      setRiskConfirmed(false);
      setLargeTransferCode("");
      onSent?.();
    } catch {}
  };

  return (
    <div className="stack-md">
      <Card
        title="Send TON"
        subtitle="Send testnet TON with risk-aware confirmations."
      >
        <div className="stack-sm">
          <Input
            label="Recipient address"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            error={errors.to}
            placeholder="kQ..."
            autoComplete="off"
          />
          <Input
            label="Amount (TON)"
            value={amountTon}
            onChange={(event) => setAmountTon(event.target.value)}
            error={errors.amountTon}
            placeholder="0.5"
            inputMode="decimal"
          />
          <p className="muted-text">
            Balance: <strong>{formatTonAmount(balanceTon)} TON</strong>
          </p>
          <Button onClick={handlePrepareReview}>Review transfer</Button>
        </div>
      </Card>

      {reviewAddress ? (
        <Card title="Review before sending">
          <div className="stack-sm">
            <p>
              <strong>To:</strong>{" "}
              {normalizeTonAddress(reviewAddress).urlSafeBounceable}
            </p>
            <p>
              <strong>Amount:</strong> {amountTon} TON
            </p>
            <p>
              <strong>Estimated fee:</strong> ~{ESTIMATED_FEE_TON} TON
            </p>
            {riskCheck?.isRisky ? (
              <Alert tone="warning" title="Risk checks triggered">
                <ul className="plain-list">
                  {riskCheck.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={riskConfirmed}
                    onChange={(event) => setRiskConfirmed(event.target.checked)}
                  />
                  I reviewed the warnings and want to continue anyway.
                </label>
              </Alert>
            ) : (
              <Badge tone="success">No risk flags detected</Badge>
            )}

            {riskCheck?.requiresLargeTransferConfirmation &&
            riskCheck.addressSuffixToConfirm ? (
              <Input
                label={`Type last 4 chars of recipient address (${riskCheck.addressSuffixToConfirm})`}
                value={largeTransferCode}
                onChange={(event) =>
                  setLargeTransferCode(event.target.value.trim())
                }
              />
            ) : null}

            <div className="actions-row">
              <Button
                variant="secondary"
                onClick={() => setReviewAddress(null)}
              >
                Edit
              </Button>
              <Button
                onClick={handleConfirmSend}
                loading={sendState.status === "loading"}
                disabled={
                  (riskCheck?.isRisky && !riskConfirmed) ||
                  (Boolean(riskCheck?.requiresLargeTransferConfirmation) &&
                    largeTransferCode !== riskCheck?.addressSuffixToConfirm)
                }
              >
                Confirm send
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {sendState.status === "success" ? (
        <Alert tone="success" title="Transfer submitted">
          {sendState.txHash
            ? `Confirmed on-chain. Tx hash: ${sendState.txHash}`
            : "Status: pending confirmation on-chain. Transaction hash will appear shortly."}
        </Alert>
      ) : null}
      {sendState.status === "error" ? (
        <Alert tone="error" title="Transfer failed">
          {sendState.error}
        </Alert>
      ) : null}
    </div>
  );
};
