import { type FormEvent, useState } from 'react';
import { ApiError, createDeposit } from 'shared/api';
import { parseAmountToMinor } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Button } from 'shared/ui/Button';
import { TextField } from 'shared/ui/TextField';
import { asDeposit, type Operation } from '../lib/operations';
import { redirectTo } from '../lib/redirect';
import styles from './WalletPage.module.css';

/** Меньше рубля провайдер не принимает, и бэкенд отвечает на это 422. */
const MIN_MINOR = 100;

const QUICK_AMOUNTS = [500, 1000, 5000];

interface DepositFormProps {
  initialAmount: string;
  onCreated: (operation: Operation) => void;
}

export function DepositForm({ initialAmount, onCreated }: DepositFormProps) {
  const [amount, setAmount] = useState(initialAmount);
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const minor = parseAmountToMinor(amount);
    if (minor === null || minor < MIN_MINOR) {
      setError(new Error('Введите сумму в рублях, не меньше 1 ₽: например 1000 или 1500,50.'));
      return;
    }

    setPending(true);
    try {
      // Платить человек уходит к провайдеру, а возвращается сюда же: зачисление
      // делает ручка статуса, которую кошелёк опрашивает после возврата.
      const deposit = await createDeposit(minor, `${window.location.origin}/wallet`);
      onCreated(asDeposit(deposit));

      if (deposit.confirmationUrl) {
        redirectTo(deposit.confirmationUrl);
        return;
      }

      // Адреса оплаты нет — платёж уже заведён, остаётся ждать провайдера.
      setAmount('');
    } catch (cause) {
      setError(explain(cause));
    } finally {
      setPending(false);
    }
  }

  return (
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

      <Button type="submit" block disabled={pending}>
        {pending ? 'Заводим платёж…' : 'Перейти к оплате'}
      </Button>

      <p className={styles.hint}>
        Оплата идёт на стороне ЮKassa. Деньги появятся на балансе, когда платёж пройдёт, — кошелёк
        дожмёт статус сам, как только вы вернётесь.
      </p>
    </form>
  );
}

/** Сбой провайдера — это 502: клиент ничего не нарушил, и повтор имеет смысл. */
function explain(cause: unknown): Error {
  if (cause instanceof ApiError && cause.status === 502) {
    return new Error('Платёжный провайдер не ответил. Платёж не заведён — попробуйте ещё раз.');
  }

  return cause instanceof Error ? cause : new Error(String(cause));
}
