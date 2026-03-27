# TON Testnet Self-Custodial Wallet (Frontend MVP)

[Русская версия](./README.ru.md)

Frontend-only self-custodial wallet for **TON testnet**.
No custom backend. Wallet UX data is stored locally in browser storage.

## What Is Implemented

- Onboarding:
  - Create new testnet wallet.
  - Show seed phrase and require confirmation before continuing.
  - Import existing wallet from seed phrase.
- Multi-wallet local management:
  - Add multiple wallets.
  - Switch active wallet from topbar.
  - Auto-navigate to Home after wallet switch.
- Home:
  - Wallet address.
  - Current TON balance.
  - Recent transactions.
  - Search transactions by address/hash/amount/type text.
- Receive:
  - Show wallet address.
  - Copy address with toast feedback.
- Send:
  - Address + amount validation.
  - Review block before submit.
  - Statuses for submit/confirmation/failure.
  - Pending item replaced with real transaction hash after resolution.
- Realtime updates:
  - WebSocket stream subscription (TON Center streaming API).
  - Keepalive ping.
  - Fallback polling on stream disconnect/error/reconnect states.
- UX states:
  - Loading, success, error handled across data refresh and send flow.
  - Toast notifications via SweetAlert2 (including loading toasts).
- Mobile adaptation:
  - Responsive topbar/navigation/actions/cards/transaction list.

## Tech Stack

- React + Vite + TypeScript
- Zustand (+ persist middleware)
- `@ton/ton` + `@ton/crypto`
- TON Center JSON-RPC + Streaming WebSocket API
- SweetAlert2
- Vitest

## Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Run tests:

```bash
npm run test
```

## Environment Variables

Copy `.env.example` to `.env` and adjust values if needed.

| Variable                              | Default                                           | Description                                                |
| ------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| `VITE_TON_TESTNET_ENDPOINT`           | `https://testnet.toncenter.com/api/v2/jsonRPC`    | Main TON testnet JSON-RPC endpoint                         |
| `VITE_TONCENTER_API_KEY`              | empty                                             | Unified TON Center API key for RPC and WebSocket streaming |
| `VITE_TON_TESTNET_FALLBACK_ENDPOINTS` | empty                                             | Comma-separated fallback RPC endpoints                     |
| `VITE_TON_TESTNET_WS_ENDPOINT`        | `wss://testnet.toncenter.com/api/streaming/v2/ws` | TON Center streaming WebSocket endpoint                    |
| `VITE_TONCENTER_STREAM_TOKEN_PARAM`   | `api_key`                                         | Query param key for token (`token` or `api_key`)           |
| `VITE_TONCENTER_STREAM_MIN_FINALITY`  | `pending`                                         | Minimum streamed finality                                  |
| `VITE_ENABLE_WS_STREAM`               | `true`                                            | Enable/disable websocket streaming                         |
| `VITE_TON_EXPLORER_TX_BASE`           | `https://testnet.tonviewer.com/transaction`       | Explorer tx base URL                                       |

### Working `.env` example

```env
VITE_TON_TESTNET_ENDPOINT=https://testnet.toncenter.com/api/v2/jsonRPC
VITE_TONCENTER_API_KEY=<YOUR_TONCENTER_KEY>
VITE_TON_EXPLORER_TX_BASE=https://testnet.tonviewer.com/transaction
VITE_ENABLE_WS_STREAM=true
VITE_TONCENTER_STREAM_TOKEN_PARAM=api_key
```

Notes:

- If your streaming token must be sent as `token`, set `VITE_TONCENTER_STREAM_TOKEN_PARAM=token`.
- For fallback endpoints you can additionally set `VITE_TON_TESTNET_FALLBACK_ENDPOINTS`.

### Where to get keys

1. Open TON Center website: `https://testnet.toncenter.com/`.
2. Go to the Telegram bot listed there(@toncenter).
3. Put this key into `VITE_TONCENTER_API_KEY` (used by JSON-RPC and WebSocket streaming).

Backward compatibility:

- `VITE_TON_TESTNET_API_KEY` and `VITE_TONCENTER_STREAM_TOKEN` are still accepted as fallback, but `VITE_TONCENTER_API_KEY` is the preferred single variable.

## FSD Structure

```text
src/
  app/
  pages/
    onboarding/
    home/
    send/
    receive/
  widgets/
    wallet-summary/
    transaction-list/
  features/
    create-wallet/
    import-wallet/
    send-ton/
    receive-ton/
    search-transactions/
  entities/
    wallet/
    transaction/
  shared/
    ui/
    lib/
    config/
    api/
```

## Architecture & Trade-offs

Detailed notes: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

### Why this architecture (evaluation item #5)

1. FSD layering (`app/pages/widgets/features/entities/shared`) separates route composition, domain logic, and reusable primitives.
2. Wallet and transaction domain logic is isolated in `entities/*`, so UI changes do not affect protocol-level logic.
3. Send/receive/search actions are in `features/*`, making critical user flows testable without page-level coupling.
4. Store + adapters live close to domain (`entities/wallet`), which keeps TON integration centralized and easier to reason about.
5. No backend is used by design to satisfy the assignment constraints and keep deploy complexity minimal.

### Why this stack (evaluation item #5)

- React + TypeScript: predictable component model + strict typing for wallet, transaction, and validation paths.
- Vite: fast local iteration and lightweight build setup for MVP delivery speed.
- Zustand (+ persist): minimal boilerplate state management with straightforward per-wallet local persistence.
- `@ton/ton` + `@ton/crypto`: native TON toolchain for mnemonic/address derivation, transaction fetch, and transfer submit.
- TON Center RPC + Streaming WS: practical way to implement blockchain reads + realtime updates without a custom backend.
- Vitest: low-friction unit tests integrated with Vite/TS stack.

### Trade-offs and why they were accepted (evaluation item #4)

- Mnemonic in localStorage.
  Reason: frontend-only MVP and zero backend requirement.
  Risk: not secure against local machine compromise.
  Mitigation direction: encrypt with passphrase (planned P0).

- Static fee estimate (`ESTIMATED_FEE_TON`) instead of simulation.
  Reason: faster UX and lower implementation complexity.
  Risk: fee precision is approximate.
  Mitigation direction: add simulation/estimation endpoint logic (future improvement).

- Optimistic pending transaction item before final hash resolution.
  Reason: TON testnet/indexer latency can be noticeable; immediate user feedback is required.
  Risk: short-lived mismatch between local pending state and final chain state.
  Mitigation: reconciliation logic and retries to replace pending with confirmed tx hash.

- WebSocket realtime + fallback polling only on WS degradation.
  Reason: balances responsiveness with network efficiency.
  Risk: dependency on third-party stream uptime.
  Mitigation: reconnect strategy, keepalive, and automatic polling fallback.

- Client-side anti-substitution checks (no server-side risk engine).
  Reason: no-backend scope and deterministic local UX checks.
  Risk: heuristics are limited vs advanced anti-fraud systems.
  Mitigation direction: stronger similarity detection and trusted contacts model.

## Security UX / Address-substitution Protection

Implemented in send flow:

1. Canonical address normalization and comparison.

- Input addresses are normalized into canonical forms (raw/bounceable/non-bounceable/url-safe).
- Equality checks are done via canonical raw representation.

2. Warning for new recipient.

- If destination is absent in local known recipients/history, user gets a warning.

3. Warning for similar address.

- App flags addresses that share canonical prefix/suffix but differ in the middle.

4. Explicit risky-send confirmation.

- Risk warnings require manual checkbox confirmation before submit.

5. Additional confirmation for large transfers.

- For amount `>= 20 TON`, user must type last 4 chars of recipient address.

## Tests

Current suite: **4 test files / 13 tests**.

1. `src/entities/wallet/lib/address.test.ts`

- `normalizeTonAddress` returns canonical forms.
- `areSameTonAddress` compares raw and friendly forms correctly.
- `isValidTonAddress` accepts valid and rejects invalid address strings.
- `isSimilarTonAddress` detects look-alike addresses.

2. `src/features/send-ton/model/validation.test.ts`

- Required fields validation.
- Invalid recipient format rejection.
- `amount + estimated fee <= balance` check.
- Returns normalized recipient for valid payload.

3. `src/features/send-ton/model/risk-checks.test.ts`

- Flags brand-new recipient as risky.
- Keeps known small transfer non-risky.
- Flags similar + large transfer and requires additional confirmation.

4. `src/entities/transaction/lib/transaction-mapper.test.ts`

- Resolves hash when raw transaction hash is function-based.
- Correctly maps ext-in wallet signed transaction with outbound value as outgoing tx.

## Limitations (MVP)

- Testnet only.
- No backend and no cross-device sync.
- Mnemonic in localStorage is not secure for production.
- No hardware wallet integration.
- No exact fee estimation via simulation.

## Future Improvements (Prioritized)

1. P0: Encrypt mnemonic at rest with user passphrase (WebCrypto).
2. P0: Improve tx confirmation tracking and hash resolution reliability.
3. P1: Trusted address book with labels/whitelisting and stronger anti-spoof checks.
4. P1: QR code generation/scanning for receive/send.
5. P2: Add Playwright e2e smoke tests for onboarding/send/receive.
6. P2: Add Jetton support and richer transaction filters/pagination.
