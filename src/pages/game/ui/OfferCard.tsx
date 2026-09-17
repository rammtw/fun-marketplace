import { Link } from 'react-router';
import { isSoldOut } from 'pages/game/lib/stock';
import { Badge } from 'shared/ui/Badge';
import { formatMoney } from 'shared/lib';
import type { OfferSummary } from 'shared/api';
import styles from './GamePage.module.css';

export function OfferCard({ offer }: { offer: OfferSummary }) {
  const soldOut = isSoldOut(offer);

  return (
    <Link
      className={`${styles.offer} ${soldOut ? styles.soldOut : ''}`}
      to={`/offers/${offer.id}`}
    >
      <div>
        <h3 className={styles.offerTitle}>{offer.title}</h3>
        <div className={styles.offerMeta}>
          <Badge tone="accent">{offer.sectionTitle}</Badge>
          <Badge>{offer.kind === 'goods' ? 'Товар' : 'Услуга'}</Badge>
          <Badge tone={!soldOut && offer.deliveryType === 'auto' ? 'success' : 'neutral'}>
            {offer.deliveryType === 'auto' ? 'Выдача сразу' : 'Выдаёт продавец'}
          </Badge>
          {soldOut ? <Badge>Нет в наличии</Badge> : null}
        </div>
      </div>
      <div>
        <div className={styles.price}>{formatMoney(offer.price)}</div>
        {/* stock есть только у товаров: у услуг поле приходит null. */}
        {typeof offer.stock === 'number' && !soldOut ? (
          <div className={styles.stock}>в наличии: {offer.stock}</div>
        ) : null}
      </div>
    </Link>
  );
}
