# TON Testnet Self-Custodial Wallet (Frontend MVP)

[English version](./README.md)

Frontend-only self-custodial кошелек для **TON testnet**.
Собственного backend нет. UX-данные кошелька хранятся локально в браузере.

## Что реализовано

- Онбординг:
  - Создание нового testnet-кошелька.
  - Показ seed-фразы и обязательное подтверждение перед продолжением.
  - Импорт существующего кошелька по seed-фразе.
- Локальное управление несколькими кошельками:
  - Добавление нескольких кошельков.
  - Переключение активного кошелька в topbar.
  - Автопереход на Home после переключения кошелька.
- Home:
  - Адрес кошелька.
  - Текущий баланс в TON.
  - Последние транзакции.
  - Поиск по транзакциям (адрес/хэш/сумма/тип в текстовом виде).
- Receive:
  - Показ адреса кошелька.
  - Копирование адреса с toast-уведомлением.
- Send:
  - Валидация адреса и суммы.
  - Review-блок перед отправкой.
  - Статусы submit/confirmation/failure.
  - Замена локального `pending` на реальный хэш транзакции после резолва.
- Realtime-обновления:
  - Подписка на WebSocket stream (TON Center streaming API).
  - Keepalive ping.
  - Fallback polling при `disconnected/error/reconnecting` у сокета.
- UX-состояния:
  - Loading/success/error обработаны в refresh/send flow.
  - Toast-уведомления через SweetAlert2 (включая loading-toast).
- Мобильная адаптация:
  - Адаптивные topbar/navigation/actions/cards/список транзакций.

## Технологический стек

- React + Vite + TypeScript
- Zustand (+ persist middleware)
- `@ton/ton` + `@ton/crypto`
- TON Center JSON-RPC + Streaming WebSocket API
- SweetAlert2
- Vitest

## Запуск

```bash
npm install
npm run dev
```

Сборка:

```bash
npm run build
```

Запуск тестов:

```bash
npm run test
```

## Переменные окружения

Скопируйте `.env.example` в `.env` и при необходимости измените значения.

| Переменная | Значение по умолчанию | Описание |
|---|---|---|
| `VITE_TON_TESTNET_ENDPOINT` | `https://testnet.toncenter.com/api/v2/jsonRPC` | Основной TON testnet JSON-RPC endpoint |
| `VITE_TONCENTER_API_KEY` | пусто | Единый TON Center API-ключ для RPC и WebSocket streaming |
| `VITE_TON_TESTNET_FALLBACK_ENDPOINTS` | пусто | Запасные RPC endpoint'ы через запятую |
| `VITE_TON_TESTNET_WS_ENDPOINT` | `wss://testnet.toncenter.com/api/streaming/v2/ws` | WebSocket endpoint TON Center streaming |
| `VITE_TONCENTER_STREAM_TOKEN_PARAM` | `api_key` | Имя query-параметра для токена (`token` или `api_key`) |
| `VITE_TONCENTER_STREAM_MIN_FINALITY` | `pending` | Минимальная finality в стриме |
| `VITE_ENABLE_WS_STREAM` | `true` | Включение/выключение websocket-стрима |
| `VITE_TON_EXPLORER_TX_BASE` | `https://testnet.tonviewer.com/transaction` | Базовый URL обозревателя транзакций |

### Рабочий пример `.env`

```env
VITE_TON_TESTNET_ENDPOINT=https://testnet.toncenter.com/api/v2/jsonRPC
VITE_TONCENTER_API_KEY=<ВАШ_КЛЮЧ_TONCENTER>
VITE_TON_EXPLORER_TX_BASE=https://testnet.tonviewer.com/transaction
VITE_ENABLE_WS_STREAM=true
VITE_TONCENTER_STREAM_TOKEN_PARAM=api_key
```

Примечания:
- Если ваш streaming-токен должен передаваться как `token`, используйте `VITE_TONCENTER_STREAM_TOKEN_PARAM=token`.
- Для failover RPC можно дополнительно задать `VITE_TON_TESTNET_FALLBACK_ENDPOINTS`.

### Где взять ключи

1. Откройте сайт TON Center: `https://toncenter.com/`.
2. Войдите в аккаунт и создайте/получите API-ключ в разделе API.
3. Укажите этот ключ в `VITE_TONCENTER_API_KEY` (он используется и для JSON-RPC, и для WebSocket streaming).


Обратная совместимость:
- `VITE_TON_TESTNET_API_KEY` и `VITE_TONCENTER_STREAM_TOKEN` всё ещё поддерживаются как fallback, но предпочтительно использовать только `VITE_TONCENTER_API_KEY`.

Важно по безопасности:
- Не коммитьте реальные ключи в git.
- Если ключ уже засвечен публично, отзовите/перевыпустите его в TON Center.

## FSD-структура

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

Подробно: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

Текущие инженерные компромиссы:

- Mnemonic хранится локально для MVP-удобства (не production-grade security).
- Комиссия оценивается приближенно (`ESTIMATED_FEE_TON`), без полной симуляции.
- Realtime зависит от доступности внешнего стрима; при дисконнектах включается fallback polling.

## Security UX / Защита от address-substitution

Реализовано в send flow:

1. Каноническая нормализация и сравнение адресов.
- Адрес приводится к canonical format (raw/bounceable/non-bounceable/url-safe).
- Сравнение выполняется по canonical raw.

2. Warning на новый адрес.
- Если получатель не встречался в локальной истории/known recipients, показывается предупреждение.

3. Warning на похожий адрес.
- Адрес помечается как рискованный, если совпадают canonical prefix/suffix, а середина отличается.

4. Явное подтверждение рискованной отправки.
- При risk warnings отправка блокируется, пока пользователь не поставит чекбокс подтверждения.

5. Дополнительное подтверждение крупного перевода.
- Для суммы `>= 20 TON` нужно ввести последние 4 символа адреса получателя.

## Тесты

Текущий набор: **4 test files / 13 тестов**.

1. `src/entities/wallet/lib/address.test.ts`
- `normalizeTonAddress` возвращает канонические формы адреса.
- `areSameTonAddress` корректно сравнивает raw и friendly представления.
- `isValidTonAddress` принимает валидные и отклоняет невалидные адреса.
- `isSimilarTonAddress` определяет похожие адреса.

2. `src/features/send-ton/model/validation.test.ts`
- Проверка обязательности полей.
- Отклонение некорректного формата адреса.
- Проверка `amount + estimated fee <= balance`.
- Для валидных данных возвращается нормализованный адрес получателя.

3. `src/features/send-ton/model/risk-checks.test.ts`
- Новый получатель помечается как risky.
- Известный получатель и небольшая сумма не помечаются как risky.
- Похожий адрес + крупная сумма требуют дополнительных подтверждений.

4. `src/entities/transaction/lib/transaction-mapper.test.ts`
- Корректное извлечение hash, когда hash приходит как функция.
- Корректный маппинг ext-in signed transaction с исходящим value как исходящей транзакции.

## Ограничения (MVP)

- Только testnet.
- Нет backend и нет синхронизации между устройствами.
- Хранение mnemonic в localStorage небезопасно для production.
- Нет интеграции с hardware wallets.
- Нет точной fee simulation.

## Future Improvements (приоритеты)

1. P0: Шифрование mnemonic в local storage с passphrase (WebCrypto).
2. P0: Улучшить надежность трекинга подтверждений и резолва tx hash.
3. P1: Доверенная address book с метками/whitelist и усиленными anti-spoof проверками.
4. P1: QR generation/scanning для receive/send.
5. P2: Добавить Playwright e2e smoke для onboarding/send/receive.
6. P2: Добавить Jetton support и более богатые фильтры/пагинацию истории.

