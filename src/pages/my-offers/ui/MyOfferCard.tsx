import { useState } from 'react';
import { Link } from 'react-router';
import { offerStatus } from 'entities/offer';
import type { SellerOfferView } from 'shared/api';
import { formatDateTime, formatMoney } from 'shared/lib';
import { Badge } from 'shared/ui/Badge';
import styles from './MyOffersPage.module.css';

interface MyOfferCardProps {
  offer: SellerOfferView;
  onPublish: (offer: SellerOfferView) => void;
  onPause: (offer: SellerOfferView) => void;
  onArchive: (offer: SellerOfferView) => void;
  busy: boolean;
}

export function MyOfferCard({ offer, onPublish, onPause, onArchive, busy }: MyOfferCardProps) {
  const status = offerStatus(offer.status);
  // Архив необратим, поэтому спрашиваем прямо в строке, а не молча архивируем.
  const [confirming, setConfirming] = useState(false);
  const archived = offer.status === 'archived';

  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h2 className={styles.cardTitle}>{offer.title}</h2>
          <div className={styles.meta}>
            <Badge tone={status.tone}>{status.label}</Badge>
            <span>
              {offer.section.gameTitle} · {offer.section.title}
            </span>
            <span>{offer.deliveryType === 'auto' ? 'автовыдача' : 'выдаёт продавец'}</span>
            {typeof offer.stock === 'number' ? <span>остаток: {offer.stock}</span> : null}
            <span>обновлён {formatDateTime(offer.updatedAt)}</span>
          </div>
        </div>
        <div className={styles.price}>{formatMoney(offer.price)}</div>
      </div>

      {archived ? null : (
        <div className={styles.actions}>
          {offer.status === 'active' ? (
            <button
              type="button"
              className={styles.action}
              disabled={busy}
              onClick={() => onPause(offer)}
            >
              Снять с витрины
            </button>
          ) : (
            <button
              type="button"
              className={styles.action}
              disabled={busy}
              onClick={() => onPublish(offer)}
            >
              Опубликовать
            </button>
          )}

          <Link className={styles.action} to={`/my/offers/${offer.id}/edit`}>
            Изменить
          </Link>

          {/* Автовыдача закрывает заказ сама, ждать выдачи там нечему. */}
          {offer.deliveryType === 'manual' ? (
            <Link
              className={styles.action}
              to={`/orders?role=seller&status=paid&offerId=${offer.id}`}
            >
              Очередь выдачи
            </Link>
          ) : null}

          {offer.status === 'active' ? (
            <Link className={styles.action} to={`/offers/${offer.id}`}>
              Посмотреть на витрине
            </Link>
          ) : null}

          {confirming ? (
            <span className={styles.confirm}>
              В архив насовсем?
              <button
                type="button"
                className={`${styles.action} ${styles.danger}`}
                disabled={busy}
                onClick={() => onArchive(offer)}
              >
                Да, в архив
              </button>
              <button type="button" className={styles.action} onClick={() => setConfirming(false)}>
                Отмена
              </button>
            </span>
          ) : (
            <button
              type="button"
              className={`${styles.action} ${styles.danger}`}
              onClick={() => setConfirming(true)}
            >
              В архив
            </button>
          )}
        </div>
      )}
    </article>
  );
}
