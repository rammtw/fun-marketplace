import { Link } from 'react-router';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.wrapper}>
      <p className={styles.code}>404</p>
      <p className={styles.text}>Такой страницы нет.</p>
      <Link className={styles.link} to="/">
        На витрину
      </Link>
    </div>
  );
}
