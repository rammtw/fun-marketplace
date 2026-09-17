import { Link } from 'react-router';
import { orderStatus } from 'entities/order';
import type { OrderSummary } from 'shared/api';
import { formatDateTime, formatMoney } from 'shared/lib';
import { Badge } from 'shared/ui/Badge';
import styles from './OrdersPage.module.css';

interface OrderRowProps {
  order: OrderSummary;
  /** У покупок контрагент — продавец, у продаж — покупатель. */
  counterpartyLabel: string;
}

export function OrderRow({ order, counterpartyLabel }: OrderRowProps) {
  const status = orderStatus(order.status);

  return (
    <Link className={styles.row} to={`/orders/${order.id}`}>
      <div>
        <h2 className={styles.rowTitle}>{order.title}</h2>
        <div className={styles.rowMeta}>
          <Badge tone={status.tone}>{status.label}</Badge>
          <span>
            {counterpartyLabel}: {order.counterparty.displayName}
          </span>
          <span>{formatDateTime(order.placedAt)}</span>
        </div>
      </div>
      <div>
        <div className={styles.amount}>{formatMoney(order.amount)}</div>
        {order.quantity > 1 ? (
          <div className={styles.quantity}>
            {order.quantity} × {formatMoney(order.price)}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
