import { type FormEvent, useCallback, useState } from 'react';
import { deliverOrder } from 'pages/order/api/deliver-order';
import { ApiError } from 'shared/api';
import type { OrderView } from 'shared/api';
import { Alert } from 'shared/ui/Alert';
import { Button } from 'shared/ui/Button';
import { TextArea } from 'shared/ui/TextArea';
import styles from './OrderPage.module.css';

interface DeliverPanelProps {
  order: OrderView;
  /** Ответ ручки — тот же заказ после выдачи: страница обновляется по нему. */
  onDelivered: (order: OrderView) => void;
  /** Заказ разъехался с тем, что на экране: перечитываем его целиком. */
  onStale: () => void;
}

/** Общий текст под формой; нарушение поля показывает сама форма. */
function deliverMessage(error: Error): string {
  if (!(error instanceof ApiError)) {
    return error.message;
  }

  switch (error.status) {
    case 403:
      return 'Выдаёт продавец: по этому заказу вы покупатель.';
    case 404:
      return 'Заказа больше нет — обновите страницу.';
    case 409:
      return `${error.message} Мы перечитали заказ — посмотрите, что с ним стало.`;
    default:
      return error.message;
  }
}

export function DeliverPanel({ order, onDelivered, onStale }: DeliverPanelProps) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setPending(true);
      setError(null);

      try {
        onDelivered(await deliverOrder(order.id, note));
      } catch (cause) {
        setError(cause instanceof Error ? cause : new Error(String(cause)));
        // 409 — заказ уже выдан или отменён кем-то ещё: показывать старое состояние нельзя.
        if (cause instanceof ApiError && cause.status === 409) {
          onStale();
        }
      } finally {
        setPending(false);
      }
    },
    [order.id, note, onDelivered, onStale],
  );

  const noteError = error instanceof ApiError ? error.violationOf('note') : undefined;

  return (
    <form className={styles.deliver} onSubmit={handleSubmit}>
      <h2 className={styles.deliveredTitle}>Выдать заказ</h2>
      <TextArea
        label="Что вы передали покупателю"
        hint="Единственное, что увидит покупатель: ключ, ссылка на сделанное, детали услуги."
        maxLength={2000}
        value={note}
        error={noteError}
        disabled={pending}
        onChange={(event) => setNote(event.target.value)}
      />

      {error && !noteError ? <Alert tone="error">{deliverMessage(error)}</Alert> : null}

      <div className={styles.deliverActions}>
        <Button type="submit" disabled={pending || note.trim() === ''}>
          {pending ? 'Отмечаем…' : 'Отметить выданным'}
        </Button>
        <span className={styles.note}>
          Деньги останутся в эскроу, пока покупатель не примет заказ.
        </span>
      </div>
    </form>
  );
}
