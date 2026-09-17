import styles from './Spinner.module.css';

export function Spinner({ label = 'Загружаем…' }: { label?: string }) {
  return (
    <div className={styles.spinner} role="status">
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </div>
  );
}
