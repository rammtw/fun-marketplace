import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { OFFER_STATUSES, offerStatus } from 'entities/offer';
import { archiveOffer, fetchMyOffers, updateOffer } from 'shared/api';
import type { OfferStatus, SellerOfferView } from 'shared/api';
import { useAsyncData } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Button } from 'shared/ui/Button';
import { Spinner } from 'shared/ui/Spinner';
import { MyOfferCard } from './MyOfferCard';
import styles from './MyOffersPage.module.css';

function readStatus(value: string | null): OfferStatus | undefined {
  return OFFER_STATUSES.find((status) => status === value);
}

export function MyOffersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = readStatus(searchParams.get('status'));

  const offers = useAsyncData((signal) => fetchMyOffers(status, signal), [status]);
  const [actionError, setActionError] = useState<Error | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { reload } = offers;

  const runAction = useCallback(
    async (offer: SellerOfferView, action: () => Promise<unknown>) => {
      setActionError(null);
      setBusyId(offer.id);
      try {
        await action();
        // Список перечитываем целиком: фильтр по статусу мог выкинуть лот из выдачи.
        reload();
      } catch (cause) {
        setActionError(cause instanceof Error ? cause : new Error(String(cause)));
      } finally {
        setBusyId(null);
      }
    },
    [reload],
  );

  const setStatusFilter = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value === '') {
        next.delete('status');
      } else {
        next.set('status', value);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Мои лоты</h1>
        <Link to="/my/offers/new">
          <Button>Завести лот</Button>
        </Link>
      </header>

      <div className={styles.chips}>
        <button
          type="button"
          className={`${styles.chip} ${status === undefined ? styles.chipActive : ''}`}
          onClick={() => setStatusFilter('')}
        >
          Все
        </button>
        {OFFER_STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            className={`${styles.chip} ${status === item ? styles.chipActive : ''}`}
            onClick={() => setStatusFilter(item)}
          >
            {offerStatus(item).label}
          </button>
        ))}
      </div>

      {offers.loading ? <Spinner label="Загружаем лоты…" /> : null}
      {offers.error ? <Alert tone="error">{offers.error.message}</Alert> : null}
      {actionError ? <Alert tone="error">{actionError.message}</Alert> : null}

      {offers.data && offers.data.length === 0 ? (
        <p className={styles.empty}>
          {status ? 'Лотов в этом статусе нет.' : 'Лотов пока нет — заведите первый.'}
        </p>
      ) : null}

      {offers.data && offers.data.length > 0 ? (
        <div className={styles.list}>
          {offers.data.map((offer) => (
            <MyOfferCard
              key={offer.id}
              offer={offer}
              busy={busyId === offer.id}
              onPublish={(item) => runAction(item, () => updateOffer(item.id, { status: 'active' }))}
              onPause={(item) => runAction(item, () => updateOffer(item.id, { status: 'paused' }))}
              onArchive={(item) => runAction(item, () => archiveOffer(item.id))}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
