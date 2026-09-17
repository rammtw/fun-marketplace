import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ORDERS_PER_PAGE,
  fetchOrders,
  type OrderRole,
} from 'pages/orders/api/fetch-orders';
import { ORDER_STATUSES, orderStatus } from 'entities/order';
import type { OrderStatus } from 'shared/api';
import { useAsyncData } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Button } from 'shared/ui/Button';
import { Spinner } from 'shared/ui/Spinner';
import { OrderRow } from './OrderRow';
import styles from './OrdersPage.module.css';

const ROLES: Array<{ value: OrderRole; label: string }> = [
  { value: 'buyer', label: 'Покупки' },
  { value: 'seller', label: 'Продажи' },
];

function readRole(value: string | null): OrderRole {
  return value === 'seller' ? 'seller' : 'buyer';
}

function readStatus(value: string | null): OrderStatus | undefined {
  return ORDER_STATUSES.find((status) => status === value);
}

function readPage(value: string | null): number {
  const page = Number(value);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = readRole(searchParams.get('role'));
  const status = readStatus(searchParams.get('status'));
  const page = readPage(searchParams.get('page'));

  const orders = useAsyncData(
    (signal) => fetchOrders({ role, status, page }, signal),
    [role, status, page],
  );

  const update = useCallback(
    (changes: Record<string, string>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const total = orders.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / (orders.data?.perPage ?? ORDERS_PER_PAGE)));

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>{role === 'seller' ? 'Мои продажи' : 'Мои покупки'}</h1>
        {orders.data ? <span className={styles.total}>всего: {total}</span> : null}
      </header>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Сторона</span>
          <div className={styles.chips}>
            {ROLES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`${styles.chip} ${role === item.value ? styles.chipActive : ''}`}
                // Смена фильтра начинает список заново: третьей страницы покупок
                // у продаж может не быть.
                onClick={() => update({ role: item.value, page: '' })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Статус</span>
          <div className={styles.chips}>
            <button
              type="button"
              className={`${styles.chip} ${status === undefined ? styles.chipActive : ''}`}
              onClick={() => update({ status: '', page: '' })}
            >
              Любой
            </button>
            {ORDER_STATUSES.map((item) => (
              <button
                key={item}
                type="button"
                className={`${styles.chip} ${status === item ? styles.chipActive : ''}`}
                onClick={() => update({ status: item, page: '' })}
              >
                {orderStatus(item).label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {orders.loading ? <Spinner label="Загружаем заказы…" /> : null}
      {orders.error ? <Alert tone="error">{orders.error.message}</Alert> : null}

      {orders.data && orders.data.items.length === 0 ? (
        <p className={styles.empty}>
          {status || role === 'seller' ? (
            'По этим фильтрам заказов нет.'
          ) : (
            <>
              Заказов пока нет.{' '}
              <Link className={styles.emptyLink} to="/">
                Посмотреть игры
              </Link>
            </>
          )}
        </p>
      ) : null}

      {orders.data && orders.data.items.length > 0 ? (
        <>
          <div className={styles.list}>
            {orders.data.items.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                counterpartyLabel={role === 'seller' ? 'Покупатель' : 'Продавец'}
              />
            ))}
          </div>

          {lastPage > 1 ? (
            <div className={styles.pager}>
              <Button
                variant="ghost"
                disabled={page <= 1}
                onClick={() => update({ page: String(page - 1) })}
              >
                ← Назад
              </Button>
              <span>
                страница {page} из {lastPage}
              </span>
              <Button
                variant="ghost"
                disabled={page >= lastPage}
                onClick={() => update({ page: String(page + 1) })}
              >
                Вперёд →
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
