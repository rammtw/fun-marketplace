import { fetchPolicy } from 'shared/api';
import { formatDateTime, useAsyncData } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Spinner } from 'shared/ui/Spinner';
import styles from './PrivacyPolicyPage.module.css';

/**
 * Действующая редакция политики целиком. Форма регистрации ведёт сюда ссылкой:
 * текст длинный, а согласие даётся под его номер, и страница по адресу — это
 * то, на что можно сослаться и вернуться после регистрации.
 */
export function PrivacyPolicyPage() {
  const policy = useAsyncData(fetchPolicy, []);

  return (
    <article className={styles.page}>
      {policy.loading ? <Spinner label="Загружаем политику…" /> : null}
      {policy.error ? (
        <Alert tone="error">
          Не удалось загрузить политику:{' '}
          <button type="button" className={styles.linkButton} onClick={policy.reload}>
            попробовать снова
          </button>
        </Alert>
      ) : null}

      {policy.data ? (
        <>
          <h1 className={styles.title}>{policy.data.title}</h1>
          <p className={styles.meta}>
            Редакция {policy.data.version} от {formatDateTime(policy.data.publishedAt)}
          </p>
          <div className={styles.body}>{policy.data.body}</div>
          {/* Контрольная сумма — чтобы было видно, что показан тот же текст,
              под которым подписывались: её же отдаёт ручка политики. */}
          <p className={styles.checksum}>sha256 текста: {policy.data.checksum}</p>
        </>
      ) : null}
    </article>
  );
}
