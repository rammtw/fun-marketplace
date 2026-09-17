import { type FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router';
import { deposit, fetchWallet } from 'shared/api';
import type { WalletView } from 'shared/api';
import { formatMoney, parseAmountToMinor, useAsyncData } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Button } from 'shared/ui/Button';
import { Spinner } from 'shared/ui/Spinner';
import { TextField } from 'shared/ui/TextField';
import styles from './WalletPage.module.css';

const QUICK_AMOUNTS = [500, 1000, 5000];

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
  const loaded = useAsyncData(fetchWallet, []);

  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [amount, setAmount] = useState(() => initialAmount(searchParams.get('need')));
  const [error, setError] = useState<Error | null>(null);
  const [deposited, setDeposited] = useState(false);
  const [pending, setPending] = useState(false);

  // Пока не пополняли, показываем загруженный баланс; после — ответ пополнения.
  const current = wallet ?? loaded.data;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDeposited(false);

    const minor = parseAmountToMinor(amount);
    if (minor === null || minor <= 0) {
      setError(new Error('Введите сумму в рублях, например 1500 или 1500,50.'));
      return;
    }

    setPending(true);
    try {
      setWallet(await deposit(minor));
      setDeposited(true);
      setAmount('');
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Кошелёк</h1>

      {loaded.loading && !current ? <Spinner label="Загружаем баланс…" /> : null}
      {loaded.error && !current ? <Alert tone="error">{loaded.error.message}</Alert> : null}

      {current ? (
        <>
          <div className={styles.balance}>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Доступно</span>
              <span className={styles.tileValue}>{formatMoney(current.available)}</span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Удержано по заказам</span>
              <span className={styles.tileValue}>{formatMoney(current.held)}</span>
            </div>
          </div>
          <p className={styles.hint}>
            Удержанное лежит в эскроу до завершения заказа: продавец получит деньги, когда
            выполнит его.
          </p>
        </>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Пополнить на, ₽"
          inputMode="decimal"
          placeholder="1000"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />

        <div className={styles.quick}>
          {QUICK_AMOUNTS.map((value) => (
            <button
              key={value}
              type="button"
              className={styles.quickButton}
              onClick={() => setAmount(String(value))}
            >
              +{value} ₽
            </button>
          ))}
        </div>

        {error ? <Alert tone="error">{error.message}</Alert> : null}
        {deposited ? <Alert tone="success">Счёт пополнен.</Alert> : null}

        <Button type="submit" block disabled={pending}>
          {pending ? 'Пополняем…' : 'Пополнить'}
        </Button>

        <p className={styles.hint}>
          Платёжного провайдера в проекте нет: пополнение — заглушка, деньги зачисляются сразу.
        </p>
      </form>
    </div>
  );
}
