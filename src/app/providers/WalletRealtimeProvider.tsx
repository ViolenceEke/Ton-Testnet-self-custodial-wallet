import { useEffect, useRef } from "react";

import { subscribeWalletTransactions, useWalletStore } from "@/entities/wallet";
import { ENABLE_WS_STREAM } from "@/shared/config/constants";

export const WalletRealtimeProvider = (): null => {
  const wallet = useWalletStore((state) => state.wallet);
  const streamStatus = useWalletStore((state) => state.streamStatus);
  const setStreamStatus = useWalletStore((state) => state.setStreamStatus);
  const refreshWalletData = useWalletStore((state) => state.refreshWalletData);

  const delayedRefreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (delayedRefreshTimerRef.current !== null) {
        window.clearTimeout(delayedRefreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!wallet || !ENABLE_WS_STREAM) {
      setStreamStatus("disconnected");
      return;
    }

    return subscribeWalletTransactions({
      accountRaw: wallet.addressRaw,
      onStatusChange: setStreamStatus,
      onTransaction: ({ finality }) => {
        void refreshWalletData();

        if (delayedRefreshTimerRef.current !== null) {
          window.clearTimeout(delayedRefreshTimerRef.current);
        }

        const delay = finality === "pending" ? 2_000 : 800;
        delayedRefreshTimerRef.current = window.setTimeout(() => {
          void refreshWalletData();
        }, delay);
      },
      onError: () => {},
    });
  }, [wallet, refreshWalletData, setStreamStatus]);

  useEffect(() => {
    if (!wallet) {
      return;
    }

    const shouldUseFallbackPolling =
      !ENABLE_WS_STREAM ||
      streamStatus === "disconnected" ||
      streamStatus === "error" ||
      streamStatus === "reconnecting";

    if (!shouldUseFallbackPolling) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshWalletData();
      }
    }, 12_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [wallet, refreshWalletData, streamStatus]);

  return null;
};
