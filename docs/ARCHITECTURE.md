# Architecture & Trade-offs

## Why this stack
- **React + Vite + TypeScript**: fast iteration and strict typing for wallet and transaction domain models.
- **Zustand + persist middleware**: simple predictable client state with localStorage persistence, matching "frontend-only, no backend" requirement.
- **@ton/ton + @ton/crypto**: native TON toolchain for mnemonic generation, wallet derivation, balance, transaction fetch, and transfer send.
- **TON Center Streaming API v2 WebSocket stream**: realtime account transaction notifications with auto-reconnect.
- **Vitest**: lightweight tests integrated with Vite.

## FSD layering
- `app`: app shell, router, global styles.
- `pages`: route-level pages (`onboarding`, `home`, `send`, `receive`).
- `widgets`: composition blocks (`wallet-summary`, `transaction-list`).
- `features`: user actions (`create-wallet`, `import-wallet`, `send-ton`, `receive-ton`, `search-transactions`).
- `entities`: domain models and adapters (`wallet`, `transaction`).
- `shared`: cross-cutting utilities (`ui`, `config`, `lib`, `api`).

## Data flow
1. User creates/imports mnemonic.
2. `entities/wallet` derives keypair/address and persists wallet data locally.
3. Wallet store keeps multiple local wallets, active wallet pointer, and per-wallet cached context.
4. For active wallet, store calls TON testnet JSON-RPC adapters for balance + transactions.
5. App-level `WalletRealtimeProvider` opens websocket subscription (`operation=subscribe`, `types=["transactions"]`, `addresses`) for active wallet.
6. Incoming websocket events trigger immediate refresh; when stream is disconnected, fallback polling is enabled.
7. Send flow validates input, runs risk checks, shows review, and submits transfer.

## Key trade-offs
- **Mnemonic in localStorage**: chosen for no-backend MVP simplicity; not production-safe against local compromise.
- **Fee estimation is static approximation** (`ESTIMATED_FEE_TON`): simple UX, but not exact network simulation.
- **Transaction submission feedback** uses seqno reference and optimistic pending item: practical for slow networks, but hash resolution is not guaranteed immediately.
- **Realtime dependency on external stream**: websocket stream depends on third-party availability; fallback polling handles disconnect windows.
- **No encrypted vault / biometrics / hardware signing**: out of MVP scope.

## Network assumptions
- App is fixed to TON testnet endpoints.
- Slow network is handled with explicit loading, retry, non-blocking status cards, and websocket auto-reconnect.
