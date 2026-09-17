import { Link } from 'react-router';
import { Badge } from 'shared/ui/Badge';
import type { GameSummary } from 'shared/api';
import styles from './GamesPage.module.css';

export function GameCard({ game }: { game: GameSummary }) {
  return (
    <Link className={styles.card} to={`/games/${game.slug}`}>
      <h2 className={styles.cardTitle}>{game.title}</h2>
      <div className={styles.platforms}>
        {game.platforms.map((platform) => (
          <Badge key={platform}>{platform}</Badge>
        ))}
      </div>
      <span className={styles.more}>Смотреть лоты →</span>
    </Link>
  );
}
