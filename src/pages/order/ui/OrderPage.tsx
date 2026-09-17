import { Link, useParams } from 'react-router';
import { fetchOrder } from 'pages/order/api/fetch-order';
import { orderStatus } from 'entities/order';
import { ApiError } from 'shared/api';
import { useSession } from 'shared/auth';
import { formatDateTime, formatMoney, useAsyncData } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Badge } from 'shared/ui/Badge';
import { Spinner } from 'shared/ui/Spinner';
import styles from './OrderPage.module.css';

export function OrderPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useSession();
  const { data: order, error, loading } = useAsyncData((signal) => fetchOrder(id, signal), [id]);

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
  // Товар выдаётся сразу, услуга ждёт продавца — покупателю важно понимать, чего ждать.
  const awaitingSeller = order.deliveredItems.length === 0 && !order.deliveredAt;

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <h1 className={styles.title}>{order.offer.title}</h1>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

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
      ) : awaitingSeller ? (
        <div className={styles.delivered}>
          <Alert tone="info">
            Деньги удерживаются в эскроу и уйдут продавцу после того, как он выполнит заказ.
          </Alert>
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
