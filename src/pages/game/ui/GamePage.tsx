import { useCallback, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { fetchOffers } from 'pages/game/api/fetch-offers';
import { isSoldOut } from 'pages/game/lib/stock';
import { ApiError, fetchGame, fetchMyOffers } from 'shared/api';
import type { OfferSummary, SectionKind } from 'shared/api';
import { useSession } from 'shared/auth';
import { Alert } from 'shared/ui/Alert';
import { Badge } from 'shared/ui/Badge';
import { Spinner } from 'shared/ui/Spinner';
import { useAsyncData } from 'shared/lib';
import { OfferCard } from './OfferCard';
import styles from './GamePage.module.css';

/**
 * Бэкенд отдаёт лоты свежими сверху; распроданные опускаем в конец, не путая
 * остальной порядок — Array.prototype.sort стабилен.
 */
function sortSoldOutLast(items: OfferSummary[]): OfferSummary[] {
  return [...items].sort((first, second) => Number(isSoldOut(first)) - Number(isSoldOut(second)));
}

const KINDS: Array<{ value: SectionKind | ''; label: string }> = [
  { value: '', label: 'Все' },
  { value: 'goods', label: 'Товары' },
  { value: 'service', label: 'Услуги' },
];

export function GamePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { status: sessionStatus } = useSession();
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

  // В витринном лоте продавца нет, поэтому свои узнаём сверкой со своим списком.
  // Запрос вспомогательный: если он не удался, каталог всё равно должен работать.
  const authenticated = sessionStatus === 'authenticated';
  const myOffers = useAsyncData(
    (signal) =>
      authenticated
        ? fetchMyOffers('active', signal).catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') {
              throw error;
            }
            return [];
          })
        : Promise.resolve([]),
    [authenticated],
  );

  const { mine, others } = useMemo(() => {
    const all = offers.data ?? [];
    const ids = new Set((myOffers.data ?? []).map((offer) => offer.id));

    return {
      mine: sortSoldOutLast(all.filter((offer) => ids.has(offer.id))),
      others: sortSoldOutLast(all.filter((offer) => !ids.has(offer.id))),
    };
  }, [offers.data, myOffers.data]);

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

      {mine.length > 0 ? (
        <section className={styles.group}>
          <h2 className={styles.groupTitle}>Ваши лоты</h2>
          <div className={styles.offers}>
            {mine.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        </section>
      ) : null}

      {others.length > 0 ? (
        <section className={styles.group}>
          {mine.length > 0 ? <h2 className={styles.groupTitle}>Остальные лоты</h2> : null}
          <div className={styles.offers}>
            {others.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
