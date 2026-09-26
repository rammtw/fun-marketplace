import { useCallback, useState } from 'react';
import { confirmOrder } from 'pages/order/api/confirm-order';
import { useWallet } from 'entities/wallet';
import { ApiError } from 'shared/api';
import type { OrderView } from 'shared/api';
import { formatMoney } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Button } from 'shared/ui/Button';
import { Modal } from 'shared/ui/Modal';
import styles from './OrderPage.module.css';

interface ConfirmPanelProps {
  order: OrderView;
  /** Ответ ручки — тот же заказ после подтверждения: страница обновляется по нему. */
  onConfirmed: (order: OrderView) => void;
  /** Заказ разъехался с тем, что на экране: страница перечитает его и покажет `message`. */
  onStale: (message: string) => void;
}

function confirmMessage(error: Error): string {
  if (!(error instanceof ApiError)) {
    return error.message;
  }

  switch (error.status) {
    case 403:
      return 'Получение подтверждает покупатель: по этому заказу вы продавец.';
    case 404:
      return 'Заказа больше нет — обновите страницу.';
    case 409:
      return 'Заказ уже не ждёт подтверждения. Мы перечитали его — посмотрите, что с ним стало.';
    default:
      return error.message;
  }
}

export function ConfirmPanel({ order, onConfirmed, onStale }: ConfirmPanelProps) {
  const { refresh: refreshWallet } = useWallet();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);

  const close = useCallback(() => {
    if (!pending) {
      setAsking(false);
    }
  }, [pending]);

  const handleConfirm = useCallback(async () => {
    setPending(true);
    setError(null);

    try {
      const confirmed = await confirmOrder(order.id);
      // Удержание по заказу списано — в шапке оно не должно висеть.
      refreshWallet();
      onConfirmed(confirmed);
    } catch (cause) {
      setAsking(false);
      // 409 — заказ уже подтверждён или ушёл в спор: показывать старое состояние нельзя.
      if (cause instanceof ApiError && cause.status === 409) {
        onStale(confirmMessage(cause));
        return;
      }
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setPending(false);
    }
  }, [order.id, onConfirmed, onStale, refreshWallet]);

  return (
    <div className={styles.deliver}>
      <h2 className={styles.deliveredTitle}>Подтвердить получение</h2>
      <Alert tone="info">
        Проверьте выданное. Пока вы не подтвердили получение, деньги удерживаются в эскроу.
      </Alert>

      {error ? <Alert tone="error">{confirmMessage(error)}</Alert> : null}

      <div className={styles.deliverActions}>
        <Button onClick={() => setAsking(true)}>Подтвердить получение</Button>
      </div>

      {asking ? (
        <Modal
          title="Подтвердить получение?"
          onClose={close}
          footer={
            <>
              <Button onClick={handleConfirm} disabled={pending}>
                {pending ? 'Подтверждаем…' : 'Да, всё получено'}
              </Button>
              <Button variant="ghost" onClick={close} disabled={pending}>
                Отмена
              </Button>
            </>
          }
        >
          <p className={styles.confirmText}>
            {formatMoney(order.amount)} из эскроу уйдут продавцу, и заказ закроется. Это необратимо:
            после подтверждения спор по заказу открыть уже нельзя.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
