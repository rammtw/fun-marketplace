import { Link, useSearchParams } from 'react-router';
import { confirmEmail } from 'shared/api';
import { Alert } from 'shared/ui/Alert';
import { Spinner } from 'shared/ui/Spinner';
import { useAsyncData } from 'shared/lib';
import styles from './AuthForm.module.css';

/**
 * Ссылка из письма ведёт прямо в API, но токен подтверждается и отсюда:
 * страница нужна, когда человек открывает ссылку на фронте или вставляет токен.
 */
export function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const { data: user, error, loading } = useAsyncData(
    (signal) =>
      token ? confirmEmail(token, signal) : Promise.reject(new Error('В ссылке нет токена.')),
    [token],
  );

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Подтверждение почты</h1>

      {loading ? <Spinner label="Проверяем ссылку…" /> : null}
      {error ? <Alert tone="error">{error.message}</Alert> : null}
      {user ? (
        <Alert tone="success">
          {user.displayName}, почта подтверждена — аккаунт активен.
        </Alert>
      ) : null}

      <p className={styles.footer}>
        {user ? <Link to="/login">Войти</Link> : <Link to="/login">Вернуться ко входу</Link>}
      </p>
    </div>
  );
}
