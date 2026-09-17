import { useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { fetchOffers } from 'pages/game/api/fetch-offers';
import { ApiError, fetchGame } from 'shared/api';
import type { SectionKind } from 'shared/api';
import { Alert } from 'shared/ui/Alert';
import { Badge } from 'shared/ui/Badge';
import { Spinner } from 'shared/ui/Spinner';
import { useAsyncData } from 'shared/lib';
import { OfferCard } from './OfferCard';
import styles from './GamePage.module.css';

const KINDS: Array<{ value: SectionKind | ''; label: string }> = [
  { value: '', label: 'Все' },
  { value: 'goods', label: 'Товары' },
  { value: 'service', label: 'Услуги' },
];

export function GamePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const sectionParam = searchParams.get('section');
  const section = sectionParam === null ? undefined : Number(sectionParam);
  const kindParam = searchParams.get('kind');
  const kind = kindParam === 'goods' || kindParam === 'service' ? kindParam : undefined;

  // Два независимых запроса уходят в одном проходе рендера — карточка игры не
  // ждёт лоты, а смена фильтра перезапрашивает только лоты.
  const game = useAsyncData((signal) => fetchGame(slug, signal), [slug]);
  const offers = useAsyncData(
    (signal) => fetchOffers(slug, { section, kind }, signal),
    [slug, section, kind],
  );

  const applyFilter = useCallback(
    (key: 'section' | 'kind', value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  if (game.error instanceof ApiError && game.error.status === 404) {
    return (
      <>
        <Alert tone="error">Игра не найдена или снята с витрины.</Alert>
        <p>
          <Link className={styles.back} to="/">
            ← ко всем играм
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Link className={styles.back} to="/">
        ← ко всем играм
      </Link>

      {game.loading ? <Spinner label="Загружаем игру…" /> : null}
      {game.error && !(game.error instanceof ApiError && game.error.status === 404) ? (
        <Alert tone="error">{game.error.message}</Alert>
      ) : null}

      {game.data ? (
        <>
          <header className={styles.header}>
            <h1 className={styles.title}>{game.data.title}</h1>
            <div className={styles.platforms}>
              {game.data.platforms.map((platform) => (
                <Badge key={platform}>{platform}</Badge>
              ))}
            </div>
          </header>

          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Раздел</span>
              <div className={styles.chips}>
                <button
                  type="button"
                  className={`${styles.chip} ${section === undefined ? styles.chipActive : ''}`}
                  onClick={() => applyFilter('section', '')}
                >
                  Все разделы
                </button>
                {game.data.sections.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.chip} ${section === item.id ? styles.chipActive : ''}`}
                    onClick={() => applyFilter('section', String(item.id))}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Тип</span>
              <div className={styles.chips}>
                {KINDS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`${styles.chip} ${
                      (kind ?? '') === item.value ? styles.chipActive : ''
                    }`}
                    onClick={() => applyFilter('kind', item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {offers.loading ? <Spinner label="Загружаем лоты…" /> : null}
      {offers.error && !(offers.error instanceof ApiError && offers.error.status === 404) ? (
        <Alert tone="error">{offers.error.message}</Alert>
      ) : null}

      {offers.data && offers.data.length === 0 ? (
        <p className={styles.empty}>По этим фильтрам лотов нет.</p>
      ) : null}

      {offers.data && offers.data.length > 0 ? (
        <div className={styles.offers}>
          {offers.data.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      ) : null}
    </>
  );
}
