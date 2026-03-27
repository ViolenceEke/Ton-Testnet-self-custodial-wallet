import { toNano } from "@ton/ton";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { WalletTransaction } from "@/entities/transaction/model/types";
import {
  areSameTonAddress,
  normalizeTonAddress,
} from "@/entities/wallet/lib/address";
import { deriveWalletFromMnemonic } from "@/entities/wallet/lib/wallet-factory";
import { getErrorMessage } from "@/shared/api";
import { WALLET_STORAGE_KEY } from "@/shared/config/storage";
import { sleep } from "@/shared/lib/async";

import {
  getWalletBalanceTon,
  getWalletTransactions,
  sendTonTransfer,
} from "../api/ton-client";
import type { WalletStreamStatus } from "../api/ton-websocket";
import type { WalletStoreState } from "./types";

type WalletCache = {
  knownRecipients: string[];
  transactions: WalletTransaction[];
  balanceTon: string;
};

const createEmptyWalletCache = (): WalletCache => ({
  knownRecipients: [],
  transactions: [],
  balanceTon: "0",
});

const initialSendState: WalletStoreState["sendState"] = {
  status: "idle",
  error: null,
  txHash: undefined,
  reference: undefined,
};

const sortTransactions = (list: WalletTransaction[]): WalletTransaction[] => {
  return [...list].sort((left, right) => right.timestamp - left.timestamp);
};

const mergeTransactions = (
  remoteTransactions: WalletTransaction[],
  currentTransactions: WalletTransaction[],
): WalletTransaction[] => {
  const remoteIds = new Set(remoteTransactions.map((item) => item.id));
  const pendingLocalTransactions = currentTransactions.filter((item) => {
    if (item.status !== "pending") {
      return false;
    }

    if (remoteIds.has(item.id)) {
      return false;
    }

    const resolvedByRemote = remoteTransactions.some((remote) => {
      if (remote.status !== "confirmed" || remote.direction !== "out") {
        return false;
      }

      const closeInTime =
        Math.abs(remote.timestamp - item.timestamp) <= 10 * 60 * 1000;
      const sameReceiver = areSameTonAddress(remote.to, item.to);
      const sameAmount =
        remote.amountNano === item.amountNano ||
        remote.amountTon === item.amountTon;

      return closeInTime && sameReceiver && sameAmount;
    });

    return !resolvedByRemote;
  });

  return sortTransactions([...pendingLocalTransactions, ...remoteTransactions]);
};

const isMatchingOutgoingTx = (input: {
  tx: WalletTransaction;
  toRaw: string;
  amountNano: string;
  sentAt: number;
}): boolean => {
  return (
    input.tx.direction === "out" &&
    input.tx.status === "confirmed" &&
    input.tx.amountNano === input.amountNano &&
    areSameTonAddress(input.tx.to, input.toRaw) &&
    input.tx.timestamp >= input.sentAt - 120_000
  );
};

const resolveOutgoingTransaction = async (params: {
  addressRaw: string;
  toRaw: string;
  amountNano: string;
  sentAt: number;
  knownHashes: Set<string>;
}): Promise<{
  confirmed: WalletTransaction;
  remote: WalletTransaction[];
} | null> => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const remote = await getWalletTransactions(params.addressRaw);
      const matching = remote.filter((tx) =>
        isMatchingOutgoingTx({
          tx,
          toRaw: params.toRaw,
          amountNano: params.amountNano,
          sentAt: params.sentAt,
        }),
      );

      const newHashMatch = matching.find(
        (tx) => !params.knownHashes.has(tx.hash),
      );
      const recentMatch = matching.find(
        (tx) => tx.timestamp >= params.sentAt - 10_000,
      );
      const confirmed = newHashMatch ?? recentMatch;

      if (confirmed) {
        return { confirmed, remote };
      }
    } catch {}

    await sleep(2_000);
  }

  return null;
};

const clearResolvedPending = (
  transactions: WalletTransaction[],
  toRaw: string,
  amountNano: string,
  confirmedAt: number,
): WalletTransaction[] => {
  return transactions.filter((tx) => {
    if (tx.status !== "pending" || tx.direction !== "out") {
      return true;
    }

    const isSameReceiver = areSameTonAddress(tx.to, toRaw);
    const isSameAmount = tx.amountNano === amountNano;
    const isSameWindow = tx.timestamp <= confirmedAt + 120_000;

    return !(isSameReceiver && isSameAmount && isSameWindow);
  });
};

const scheduleBalanceRefreshRetries = (
  refreshBalance: () => Promise<void>,
): void => {
  void (async () => {
    const delays = [0, 2_000, 5_000, 10_000];

    for (const delay of delays) {
      if (delay > 0) {
        await sleep(delay);
      }

      await refreshBalance();
    }
  })();
};

const hydrateActiveWalletSnapshot = (state: {
  wallets: WalletStoreState["wallets"];
  activeWalletId: string | null;
  walletCaches: WalletStoreState["walletCaches"];
}) => {
  const fallbackWallet = state.wallets[0] ?? null;
  const activeWallet =
    (state.activeWalletId
      ? (state.wallets.find((wallet) => wallet.id === state.activeWalletId) ??
        null)
      : null) ?? fallbackWallet;

  if (!activeWallet) {
    return {
      activeWalletId: null,
      wallet: null,
      knownRecipients: [] as string[],
      transactions: [] as WalletTransaction[],
      balanceTon: "0",
    };
  }

  const cache = state.walletCaches[activeWallet.id] ?? createEmptyWalletCache();

  return {
    activeWalletId: activeWallet.id,
    wallet: activeWallet,
    knownRecipients: [...cache.knownRecipients],
    transactions: [...cache.transactions],
    balanceTon: cache.balanceTon,
  };
};

export const useWalletStore = create<WalletStoreState>()(
  persist(
    (set, get) => ({
      wallets: [],
      activeWalletId: null,
      walletCaches: {},
      wallet: null,
      knownRecipients: [],
      balanceTon: "0",
      balanceStatus: "idle",
      balanceError: null,
      transactions: [],
      transactionsStatus: "idle",
      transactionsError: null,
      streamStatus: "disconnected",
      sendState: initialSendState,

      activateWalletByMnemonic: async (mnemonic) => {
        const identity = await deriveWalletFromMnemonic(mnemonic);
        const walletId = identity.addressRaw;

        set((state) => {
          const nextWallet = {
            id: walletId,
            mnemonic: identity.mnemonic,
            publicKeyHex: identity.publicKeyHex,
            addressRaw: identity.addressRaw,
            addressFriendly: identity.addressFriendly,
          };

          const hasWallet = state.wallets.some(
            (wallet) => wallet.id === walletId,
          );
          const wallets = hasWallet
            ? state.wallets.map((wallet) =>
                wallet.id === walletId ? nextWallet : wallet,
              )
            : [...state.wallets, nextWallet];

          const cache =
            state.walletCaches[walletId] ?? createEmptyWalletCache();

          return {
            wallets,
            activeWalletId: walletId,
            wallet: nextWallet,
            walletCaches: {
              ...state.walletCaches,
              [walletId]: cache,
            },
            knownRecipients: [...cache.knownRecipients],
            transactions: [...cache.transactions],
            balanceTon: cache.balanceTon,
            balanceStatus: "idle",
            balanceError: null,
            transactionsStatus: "idle",
            transactionsError: null,
            sendState: initialSendState,
            streamStatus: "disconnected",
          };
        });

        await get().refreshWalletData();
      },

      switchActiveWallet: async (walletId) => {
        const state = get();
        const targetWallet = state.wallets.find(
          (wallet) => wallet.id === walletId,
        );

        if (!targetWallet) {
          return;
        }

        const cache = state.walletCaches[walletId] ?? createEmptyWalletCache();

        set({
          activeWalletId: walletId,
          wallet: targetWallet,
          knownRecipients: [...cache.knownRecipients],
          transactions: [...cache.transactions],
          balanceTon: cache.balanceTon,
          balanceStatus: "idle",
          balanceError: null,
          transactionsStatus: "idle",
          transactionsError: null,
          sendState: initialSendState,
          streamStatus: "disconnected",
        });

        await get().refreshWalletData();
      },

      clearWallet: () => {
        set({
          wallets: [],
          activeWalletId: null,
          walletCaches: {},
          wallet: null,
          knownRecipients: [],
          balanceTon: "0",
          balanceStatus: "idle",
          balanceError: null,
          transactions: [],
          transactionsStatus: "idle",
          transactionsError: null,
          streamStatus: "disconnected",
          sendState: initialSendState,
        });
      },

      refreshBalance: async () => {
        const wallet = get().wallet;
        const activeWalletId = get().activeWalletId;
        const balanceStatus = get().balanceStatus;

        if (!wallet || !activeWalletId || balanceStatus === "loading") {
          return;
        }

        set({ balanceStatus: "loading", balanceError: null });

        try {
          const balanceTon = await getWalletBalanceTon(wallet.addressRaw);

          set((state) => {
            if (state.activeWalletId !== activeWalletId) {
              return {};
            }

            const existingCache =
              state.walletCaches[activeWalletId] ?? createEmptyWalletCache();

            return {
              balanceTon,
              balanceStatus: "success",
              walletCaches: {
                ...state.walletCaches,
                [activeWalletId]: {
                  ...existingCache,
                  balanceTon,
                },
              },
            };
          });
        } catch (error) {
          set((state) => {
            if (state.activeWalletId !== activeWalletId) {
              return {};
            }

            return {
              balanceStatus: "error",
              balanceError: getErrorMessage(error),
            };
          });
        }
      },

      refreshTransactions: async () => {
        const wallet = get().wallet;
        const activeWalletId = get().activeWalletId;
        const transactionsStatus = get().transactionsStatus;

        if (!wallet || !activeWalletId || transactionsStatus === "loading") {
          return;
        }

        set({ transactionsStatus: "loading", transactionsError: null });

        try {
          const remoteTransactions = await getWalletTransactions(
            wallet.addressRaw,
          );

          set((state) => {
            if (state.activeWalletId !== activeWalletId) {
              return {};
            }

            const transactions = mergeTransactions(
              remoteTransactions,
              state.transactions,
            );
            const existingCache =
              state.walletCaches[activeWalletId] ?? createEmptyWalletCache();

            return {
              transactionsStatus: "success",
              transactions,
              walletCaches: {
                ...state.walletCaches,
                [activeWalletId]: {
                  ...existingCache,
                  transactions,
                  knownRecipients: [...state.knownRecipients],
                  balanceTon: state.balanceTon,
                },
              },
            };
          });
        } catch (error) {
          set((state) => {
            if (state.activeWalletId !== activeWalletId) {
              return {};
            }

            return {
              transactionsStatus: "error",
              transactionsError: getErrorMessage(error),
            };
          });
        }
      },

      refreshWalletData: async () => {
        await Promise.all([
          get().refreshBalance(),
          get().refreshTransactions(),
        ]);
      },

      sendTon: async ({ to, amountTon }) => {
        const wallet = get().wallet;
        const activeWalletId = get().activeWalletId;

        if (!wallet || !activeWalletId) {
          throw new Error("Wallet is not initialized");
        }

        set({
          sendState: {
            status: "loading",
            error: null,
            txHash: undefined,
            reference: undefined,
          },
        });

        try {
          const normalized = normalizeTonAddress(to);
          const sentAt = Date.now();
          const amountNano = toNano(amountTon).toString();
          const knownHashes = new Set(
            get()
              .transactions.filter((tx) => tx.status === "confirmed")
              .map((tx) => tx.hash),
          );

          const response = await sendTonTransfer({
            mnemonic: wallet.mnemonic,
            toAddress: normalized.urlSafeBounceable,
            amountTon,
          });

          const pendingTransaction: WalletTransaction = {
            id: `pending:${response.reference}:${sentAt}`,
            hash: "pending",
            lt: "pending",
            timestamp: sentAt,
            from: wallet.addressRaw,
            to: normalized.raw,
            amountNano,
            amountTon,
            direction: "out",
            status: "pending",
            description: `Sending TON (${response.reference})`,
          };

          set((state) => {
            if (state.activeWalletId !== activeWalletId) {
              return {};
            }

            const transactions = sortTransactions([
              pendingTransaction,
              ...state.transactions,
            ]);
            const knownRecipients = state.knownRecipients.some(
              (recipient) => recipient === normalized.raw,
            )
              ? state.knownRecipients
              : [...state.knownRecipients, normalized.raw];
            const existingCache =
              state.walletCaches[activeWalletId] ?? createEmptyWalletCache();

            return {
              transactions,
              knownRecipients,
              walletCaches: {
                ...state.walletCaches,
                [activeWalletId]: {
                  ...existingCache,
                  transactions,
                  knownRecipients,
                  balanceTon: state.balanceTon,
                },
              },
              sendState: {
                status: "success",
                error: null,
                txHash: undefined,
                reference: response.reference,
              },
            };
          });

          scheduleBalanceRefreshRetries(get().refreshBalance);

          void (async () => {
            const resolved = await resolveOutgoingTransaction({
              addressRaw: wallet.addressRaw,
              toRaw: normalized.raw,
              amountNano,
              sentAt,
              knownHashes,
            });

            if (resolved) {
              set((state) => {
                if (state.activeWalletId !== activeWalletId) {
                  return {};
                }

                const merged = mergeTransactions(
                  resolved.remote,
                  state.transactions,
                );
                const transactions = clearResolvedPending(
                  merged,
                  normalized.raw,
                  amountNano,
                  resolved.confirmed.timestamp,
                );
                const existingCache =
                  state.walletCaches[activeWalletId] ??
                  createEmptyWalletCache();

                return {
                  transactions,
                  walletCaches: {
                    ...state.walletCaches,
                    [activeWalletId]: {
                      ...existingCache,
                      transactions,
                      knownRecipients: [...state.knownRecipients],
                      balanceTon: state.balanceTon,
                    },
                  },
                  sendState:
                    state.sendState.status === "error"
                      ? state.sendState
                      : {
                          status: "success",
                          error: null,
                          txHash: resolved.confirmed.hash,
                          reference: response.reference,
                        },
                };
              });

              await get().refreshBalance();
              return;
            }

            await get().refreshWalletData();
          })();

          return {
            reference: response.reference,
          };
        } catch (error) {
          const errorMessage = getErrorMessage(error);
          set((state) => {
            if (state.activeWalletId !== activeWalletId) {
              return {};
            }

            return {
              sendState: {
                status: "error",
                error: errorMessage,
                txHash: undefined,
                reference: undefined,
              },
            };
          });
          throw error;
        }
      },

      setStreamStatus: (streamStatus: WalletStreamStatus) => {
        set({ streamStatus });
      },

      resetSendState: () => {
        set({ sendState: initialSendState });
      },
    }),
    {
      name: WALLET_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        wallets: state.wallets,
        activeWalletId: state.activeWalletId,
        walletCaches: state.walletCaches,
        wallet: state.wallet,
        knownRecipients: state.knownRecipients,
        transactions: state.transactions,
        balanceTon: state.balanceTon,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }

        const hydrated = hydrateActiveWalletSnapshot({
          wallets: state.wallets,
          activeWalletId: state.activeWalletId,
          walletCaches: state.walletCaches,
        });

        state.activeWalletId = hydrated.activeWalletId;
        state.wallet = hydrated.wallet;
        state.knownRecipients = hydrated.knownRecipients;
        state.transactions = hydrated.transactions;
        state.balanceTon = hydrated.balanceTon;
      },
    },
  ),
);
