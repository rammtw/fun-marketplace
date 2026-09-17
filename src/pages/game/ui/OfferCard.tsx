import { Link } from 'react-router';
import { Badge } from 'shared/ui/Badge';
import { formatMoney } from 'shared/lib';
import type { OfferSummary } from 'shared/api';
import styles from './GamePage.module.css';

export function OfferCard({ offer }: { offer: OfferSummary }) {
  return (
    <Link className={styles.offer} to={`/offers/${offer.id}`}>
      <div>
        <h3 className={styles.offerTitle}>{offer.title}</h3>
        <div className={styles.offerMeta}>
          <Badge tone="accent">{offer.sectionTitle}</Badge>
          <Badge>{offer.kind === 'goods' ? 'Товар' : 'Услуга'}</Badge>
          <Badge tone={offer.deliveryType === 'auto' ? 'success' : 'neutral'}>
            {offer.deliveryType === 'auto' ? 'Выдача сразу' : 'Выдаёт продавец'}
          </Badge>
        </div>
      </div>
      <div>
        <div className={styles.price}>{formatMoney(offer.price)}</div>
        {/* stock есть только у товаров: у услуг поле приходит null. */}
        {typeof offer.stock === 'number' ? (
          <div className={styles.stock}>в наличии: {offer.stock}</div>
        ) : null}
      </div>
    </Link>
  );
}
