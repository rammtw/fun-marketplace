import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useWallet } from 'entities/wallet';
import { fetchDeposits, fetchPayouts } from 'shared/api';
import { formatMoney, useAsyncData } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Spinner } from 'shared/ui/Spinner';
import { checkOperation } from '../lib/check-operation';
import { mergeOperations, type Operation } from '../lib/operations';
import { DepositForm } from './DepositForm';
import { OperationRow } from './OperationRow';
import { PayoutForm } from './PayoutForm';
import styles from './WalletPage.module.css';

/** Со страницы лота приходит `need` — сколько копеек не хватило на покупку. */
function initialAmount(need: string | null): string {
  const minor = need === null ? NaN : Number(need);
  if (!Number.isFinite(minor) || minor <= 0) {
    return '';
  }

  return String(Math.ceil(minor / 100));
}

export function WalletPage() {
  const [searchParams] = useSearchParams();
  const { balance, loading, error: loadError, refresh } = useWallet();

  const history = useAsyncData(
    (signal) =>
      Promise.all([fetchDeposits(signal), fetchPayouts(signal)]).then(([deposits, payouts]) =>
        mergeOperations(deposits, payouts),
      ),
    [],
  );

  const [operations, setOperations] = useState<Operation[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<Error | null>(null);

  useEffect(() => {
    if (history.data) {
      setOperations(history.data);
    }
  }, [history.data]);

  const replace = useCallback((fresh: Operation[]) => {
    setOperations((previous) =>
      previous.map((operation) => fresh.find((item) => item.id === operation.id) ?? operation),
    );
  }, []);

  /**
   * Возврат с оплаты приводит человека на кошелёк, а деньги зачисляет ручка
   * статуса — поэтому незавершённые операции опрашиваем сами, один раз на
   * загрузку страницы. Отказ ручки тут молчаливый: история уже показана.
   */
  useEffect(() => {
    const pending = (history.data ?? []).filter((operation) => operation.status === 'pending');
    if (pending.length === 0) {
      return;
    }

    let alive = true;
    Promise.all(
      pending.map((operation) => checkOperation(operation).catch(() => operation)),
    ).then((fresh) => {
      if (!alive) {
        return;
      }
      replace(fresh);
      // Деньги могли зачислиться или вернуться из удержания.
      if (fresh.some((operation) => operation.status !== 'pending')) {
        refresh();
      }
    });

    return () => {
      alive = false;
    };
  }, [history.data, replace, refresh]);

  const check = useCallback(
    async (operation: Operation) => {
      setCheckError(null);
      setBusyId(operation.id);
      try {
        const fresh = await checkOperation(operation);
        replace([fresh]);
        if (fresh.status !== 'pending') {
          refresh();
        }
      } catch (cause) {
        setCheckError(cause instanceof Error ? cause : new Error(String(cause)));
      } finally {
        setBusyId(null);
      }
    },
    [replace, refresh],
  );

  const prepend = useCallback((operation: Operation) => {
    setOperations((previous) => [operation, ...previous]);
  }, []);

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Кошелёк</h1>

        {loading && !balance ? <Spinner label="Загружаем баланс…" /> : null}
        {loadError && !balance ? <Alert tone="error">{loadError.message}</Alert> : null}

        {balance ? (
          <>
            <div className={styles.balance}>
              <div className={styles.tile}>
                <span className={styles.tileLabel}>Доступно</span>
                <span className={styles.tileValue}>{formatMoney(balance.available)}</span>
              </div>
              <div className={styles.tile}>
                <span className={styles.tileLabel}>Удержано</span>
                <span className={styles.tileValue}>{formatMoney(balance.held)}</span>
              </div>
            </div>
            <p className={styles.hint}>
              Удержанное лежит в эскроу до завершения заказа, а выплата удерживается, пока её не
              подтвердит провайдер.
            </p>
          </>
        ) : null}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Пополнить</h2>
        <DepositForm
          initialAmount={initialAmount(searchParams.get('need'))}
          onCreated={prepend}
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Вывести на карту</h2>
        <PayoutForm
          available={balance?.available ?? null}
          onCreated={(operation) => {
            prepend(operation);
            // Сумма ушла в удержание — доступное на балансе изменилось.
            refresh();
          }}
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>История операций</h2>

        {history.loading ? <Spinner label="Загружаем операции…" /> : null}
        {history.error ? <Alert tone="error">{history.error.message}</Alert> : null}
        {checkError ? <Alert tone="error">{checkError.message}</Alert> : null}

        {!history.loading && operations.length === 0 ? (
          <p className={styles.hint}>Пополнений и выводов ещё не было.</p>
        ) : null}

        {operations.length > 0 ? (
          <ul className={styles.list}>
            {operations.map((operation) => (
              <OperationRow
                key={operation.id}
                operation={operation}
                busy={busyId === operation.id}
                onCheck={check}
              />
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
