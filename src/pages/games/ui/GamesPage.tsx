import { useDeferredValue, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { fetchGames } from 'shared/api';
import { Alert } from 'shared/ui/Alert';
import { Spinner } from 'shared/ui/Spinner';
import { useAsyncData } from 'shared/lib';
import { GameCard } from './GameCard';
import styles from './GamesPage.module.css';

export function GamesPage() {
  const { data: games, error, loading } = useAsyncData(fetchGames, []);
  // Запрос набирают в шапке, а живёт он в адресе: витрина его только читает.
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  // Список игр небольшой, но фильтрация не должна тормозить набор текста.
  const deferredQuery = useDeferredValue(query);

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!games) {
      return [];
    }
    if (!needle) {
      return games;
    }

    return games.filter(
      (game) =>
        game.title.toLowerCase().includes(needle) ||
        game.platforms.some((platform) => platform.toLowerCase().includes(needle)),
    );
  }, [games, deferredQuery]);

  return (
    <>
      {loading ? <Spinner label="Загружаем игры…" /> : null}
      {error ? <Alert tone="error">{error.message}</Alert> : null}

      {games && visible.length === 0 ? (
        <p className={styles.empty}>
          {games.length === 0 ? 'Игр пока нет.' : 'Ничего не нашлось по такому запросу.'}
        </p>
      ) : null}

      {visible.length > 0 ? (
        <div className={styles.grid}>
          {visible.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : null}
    </>
  );
}
