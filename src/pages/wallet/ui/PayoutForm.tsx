import { type FormEvent, useState } from 'react';
import { ApiError, createPayout } from 'shared/api';
import type { Money } from 'shared/api';
import { formatMoney, parseAmountToMinor } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Button } from 'shared/ui/Button';
import { TextField } from 'shared/ui/TextField';
import { asPayout, type Operation } from '../lib/operations';
import styles from './WalletPage.module.css';

/** Минимум вывода на бэкенде — 100 ₽, меньше отвергается как 422. */
const MIN_MINOR = 10000;

interface PayoutFormProps {
  available: Money | null;
  onCreated: (operation: Operation) => void;
}

export function PayoutForm({ available, onCreated }: PayoutFormProps) {
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSent(false);

    const minor = parseAmountToMinor(amount);
    if (minor === null || minor < MIN_MINOR) {
      setError(new Error('Минимальная сумма вывода — 100 ₽.'));
      return;
    }
    if (token.trim() === '') {
      setError(new Error('Нужен синоним карты из виджета ЮKassa: номер карты площадка не принимает.'));
      return;
    }
    // Баланс у нас на руках, так что за отказом можно не ходить.
    if (available && minor > available.amount) {
      setError(new Error(`Свободных денег ${formatMoney(available)} — вывести больше нельзя.`));
      return;
    }

    setPending(true);
    try {
      onCreated(asPayout(await createPayout(minor, token.trim())));
      setSent(true);
      setAmount('');
      setToken('');
    } catch (cause) {
      setError(explain(cause, available));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <TextField
        label="Вывести, ₽"
        inputMode="decimal"
        placeholder="1000"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        hint="Не меньше 100 ₽"
      />
      <TextField
        label="Синоним карты"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        hint="Выдаётся виджетом выплат ЮKassa. Номер карты на площадку не передаётся и здесь не принимается."
      />

      {error ? <Alert tone="error">{error.message}</Alert> : null}
      {sent ? (
        <Alert tone="success">
          Выплата отправлена. Сумма удержана на кошельке и спишется окончательно, когда провайдер
          подтвердит перевод.
        </Alert>
      ) : null}

      <Button type="submit" block disabled={pending}>
        {pending ? 'Отправляем…' : 'Вывести на карту'}
      </Button>
    </form>
  );
}

function explain(cause: unknown, available: Money | null): Error {
  // Текст 409 с бэкенда показывать нельзя: суммы там в копейках.
  if (cause instanceof ApiError && cause.status === 409) {
    return new Error(
      available
        ? `Свободных денег не хватило: доступно ${formatMoney(available)}.`
        : 'На кошельке не хватило свободных денег.',
    );
  }
  if (cause instanceof ApiError && cause.status === 502) {
    return new Error('Провайдер не ответил. Деньги остались на кошельке — попробуйте позже.');
  }

  return cause instanceof Error ? cause : new Error(String(cause));
}
