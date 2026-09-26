import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { fetchOrder } from 'pages/order/api/fetch-order';
import { orderStatus } from 'entities/order';
import { ApiError } from 'shared/api';
import type { OrderView } from 'shared/api';
import { useSession } from 'shared/auth';
import { formatDateTime, formatMoney, useAsyncData } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Badge } from 'shared/ui/Badge';
import { Spinner } from 'shared/ui/Spinner';
import { ConfirmPanel } from './ConfirmPanel';
import { DeliverPanel } from './DeliverPanel';
import styles from './OrderPage.module.css';

export function OrderPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useSession();
  const { data, error, loading, reload } = useAsyncData((signal) => fetchOrder(id, signal), [id]);
  // Ручки выдачи и подтверждения возвращают заказ целиком, так что после них
  // показываем ответ, а не перечитываем. Сверка по id гасит накладку при переходе
  // на другой заказ.
  const [updated, setUpdated] = useState<OrderView | null>(null);
  const order = updated?.id === id ? updated : data;

  // Панель, получившая 409, после перечитывания пропадает вместе со своей ошибкой
  // (статус уже другой), поэтому объяснение держит страница.
  const [stale, setStale] = useState<{ id: string; message: string } | null>(null);

  const handleStale = useCallback(
    (message: string) => {
      setUpdated(null);
      setStale({ id, message });
      reload();
    },
    [id, reload],
  );

  if (error instanceof ApiError && error.status === 404) {
    return (
      <Alert tone="error">Заказ не найден — либо его нет, либо он принадлежит другим.</Alert>
    );
  }

  if (loading) {
    return <Spinner label="Загружаем заказ…" />;
  }

  if (error) {
    return <Alert tone="error">{error.message}</Alert>;
  }

  if (!order) {
    return null;
  }

  const status = orderStatus(order.status);
  const isSeller = user?.id === order.sellerId;
  // Товар с автовыдачей уходит покупателю сразу, услуга ждёт продавца: в статусе
  // paid выдача ещё за ним, и только он её может закрыть.
  const awaitingSeller = order.status === 'paid' && order.deliveredItems.length === 0;
  // Выданный заказ закрывает покупатель: до подтверждения деньги в эскроу.
  const awaitingBuyer = order.status === 'delivered';

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <h1 className={styles.title}>{order.offer.title}</h1>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {stale?.id === id ? <Alert tone="error">{stale.message}</Alert> : null}

      <dl className={styles.rows}>
        <dt className={styles.key}>Количество</dt>
        <dd className={styles.value}>{order.quantity}</dd>

        <dt className={styles.key}>{isSeller ? 'Сумма заказа' : 'Списано'}</dt>
        <dd className={`${styles.value} ${styles.total}`}>{formatMoney(order.amount)}</dd>

        {isSeller ? (
          <>
            <dt className={styles.key}>Комиссия площадки</dt>
            <dd className={styles.value}>{formatMoney(order.commission)}</dd>
            <dt className={styles.key}>К выплате</dt>
            <dd className={styles.value}>{formatMoney(order.payout)}</dd>
          </>
        ) : null}

        <dt className={styles.key}>Создан</dt>
        <dd className={styles.value}>{formatDateTime(order.placedAt)}</dd>

        {order.paidAt ? (
          <>
            <dt className={styles.key}>Оплачен</dt>
            <dd className={styles.value}>{formatDateTime(order.paidAt)}</dd>
          </>
        ) : null}

        {order.deliveredAt ? (
          <>
            <dt className={styles.key}>Выдан</dt>
            <dd className={styles.value}>{formatDateTime(order.deliveredAt)}</dd>
          </>
        ) : null}

        {order.completedAt ? (
          <>
            <dt className={styles.key}>Завершён</dt>
            <dd className={styles.value}>{formatDateTime(order.completedAt)}</dd>
          </>
        ) : null}
      </dl>

      {order.deliveredItems.length > 0 ? (
        <div className={styles.delivered}>
          <h2 className={styles.deliveredTitle}>Что выдано</h2>
          <ul className={styles.items}>
            {order.deliveredItems.map((item) => (
              <li key={item} className={styles.item}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {order.deliveryNote ? (
        <div className={styles.delivered}>
          <h2 className={styles.deliveredTitle}>
            {isSeller ? 'Что вы передали' : 'Что передал продавец'}
          </h2>
          <p className={styles.deliveryNote}>{order.deliveryNote}</p>
        </div>
      ) : null}

      {awaitingSeller ? (
        <div className={styles.delivered}>
          {isSeller ? (
            <DeliverPanel order={order} onDelivered={setUpdated} onStale={handleStale} />
          ) : (
            <Alert tone="info">
              Деньги удерживаются в эскроу. Продавец получит их, только когда выполнит заказ и
              вы подтвердите получение.
            </Alert>
          )}
        </div>
      ) : null}

      {awaitingBuyer ? (
        <div className={styles.delivered}>
          {isSeller ? (
            <Alert tone="info">
              Деньги удерживаются в эскроу, пока покупатель не подтвердит получение.
            </Alert>
          ) : (
            <ConfirmPanel order={order} onConfirmed={setUpdated} onStale={handleStale} />
          )}
        </div>
      ) : null}

      <p className={styles.footer}>
        <Link className={styles.link} to={`/offers/${order.offerId}`}>
          Открыть лот
        </Link>
      </p>
    </div>
  );
}
