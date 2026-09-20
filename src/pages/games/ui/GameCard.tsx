import { Link } from 'react-router';
import type { GameSummary } from 'shared/api';
import styles from './GamesPage.module.css';

export function GameCard({ game }: { game: GameSummary }) {
  return (
    <Link className={styles.card} to={`/games/${game.slug}`}>
      <h2 className={styles.cardTitle}>{game.title}</h2>
      <span className={styles.more}>Смотреть лоты →</span>
    </Link>
  );
}
