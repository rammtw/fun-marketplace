import { Link, useParams } from 'react-router';
import { fetchOffer } from 'pages/offer/api/fetch-offer';
import { ApiError } from 'shared/api';
import { useAsyncData } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Badge } from 'shared/ui/Badge';
import { Spinner } from 'shared/ui/Spinner';
import { PurchasePanel } from './PurchasePanel';
import styles from './OfferPage.module.css';

/** Значения атрибутов приходят как есть из схемы раздела — приводим к строке. */
function formatAttribute(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'да' : 'нет';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return String(value);
}

export function OfferPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: offer, error, loading } = useAsyncData((signal) => fetchOffer(id, signal), [id]);

  if (error instanceof ApiError && error.status === 404) {
    return (
      <>
        <Alert tone="error">Лот не найден или снят с публикации.</Alert>
        <p>
          <Link className={styles.back} to="/">
            ← ко всем играм
          </Link>
        </p>
      </>
    );
  }

  const attributes = offer ? Object.entries(offer.attributes) : [];

  return (
    <>
      {offer ? (
        <Link className={styles.back} to={`/games/${offer.section.gameSlug}`}>
          ← {offer.section.gameTitle}
        </Link>
      ) : null}

      {loading ? <Spinner label="Загружаем лот…" /> : null}
      {error && !(error instanceof ApiError && error.status === 404) ? (
        <Alert tone="error">{error.message}</Alert>
      ) : null}

      {offer ? (
        <div className={styles.layout}>
          <article className={styles.card}>
            <h1 className={styles.title}>{offer.title}</h1>
            <div className={styles.meta}>
              <Badge tone="accent">{offer.section.title}</Badge>
              <Badge>{offer.section.kind === 'goods' ? 'Товар' : 'Услуга'}</Badge>
              <Badge tone={offer.deliveryType === 'auto' ? 'success' : 'neutral'}>
                {offer.deliveryType === 'auto' ? 'Выдача сразу' : 'Выдаёт продавец'}
              </Badge>
              {typeof offer.stock === 'number' ? <Badge>в наличии: {offer.stock}</Badge> : null}
            </div>

            <p className={styles.description}>{offer.description}</p>

            {attributes.length > 0 ? (
              <>
                <h2 className={styles.sectionTitle}>Характеристики</h2>
                <dl className={styles.attributes}>
                  {attributes.map(([key, value]) => (
                    <div key={key} style={{ display: 'contents' }}>
                      <dt className={styles.attributeKey}>{key}</dt>
                      <dd className={styles.attributeValue}>{formatAttribute(value)}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : null}

            <p className={styles.seller}>
              Продавец: <span className={styles.sellerName}>{offer.seller.displayName}</span>
            </p>
          </article>

          <PurchasePanel offer={offer} />
        </div>
      ) : null}
    </>
  );
}
