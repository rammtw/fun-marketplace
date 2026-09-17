import { useDeferredValue, useMemo, useState } from 'react';
import { fetchGames } from 'shared/api';
import { Alert } from 'shared/ui/Alert';
import { Spinner } from 'shared/ui/Spinner';
import { TextField } from 'shared/ui/TextField';
import { useAsyncData } from 'shared/lib';
import { GameCard } from './GameCard';
import styles from './GamesPage.module.css';

export function GamesPage() {
  const { data: games, error, loading } = useAsyncData(fetchGames, []);
  const [query, setQuery] = useState('');
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
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Игры площадки</h1>
          <p className={styles.subtitle}>
            Выберите игру, чтобы посмотреть товары и услуги её продавцов.
          </p>
        </div>
        <div className={styles.search}>
          <TextField
            label="Поиск"
            type="search"
            placeholder="Название или платформа"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </header>

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
