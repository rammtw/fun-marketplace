import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { ApiError, register } from 'shared/api';
import type { UserView } from 'shared/api';
import { Alert } from 'shared/ui/Alert';
import { Button } from 'shared/ui/Button';
import { TextField } from 'shared/ui/TextField';
import styles from './AuthForm.module.css';

const PASSWORD_MIN_LENGTH = 8;

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [created, setCreated] = useState<UserView | null>(null);
  const [pending, setPending] = useState(false);

  // Бэкенд называет поле в violations, так что ошибку показываем под ним,
  // а не общим текстом над формой.
  const violation = (path: string) =>
    error instanceof ApiError ? error.violationOf(path) : undefined;
  const commonError = error && !(error instanceof ApiError && error.violations.length > 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      setCreated(await register({ email, password, displayName }));
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setPending(false);
    }
  }

  if (created) {
    return (
      <div className={styles.wrapper}>
        <h1 className={styles.title}>Почти готово</h1>
        <Alert tone="success">
          {created.displayName}, аккаунт создан. Мы отправили письмо со ссылкой подтверждения —
          войти можно будет после перехода по ней.
        </Alert>
        <p className={styles.footer}>
          Подтвердили? <Link to="/login">Войти</Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Регистрация</h1>
      <p className={styles.subtitle}>Аккаунт активируется после подтверждения почты.</p>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Почта"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={violation('email')}
        />
        <TextField
          label="Имя на площадке"
          name="displayName"
          autoComplete="nickname"
          required
          minLength={2}
          maxLength={64}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          error={violation('displayName')}
        />
        <TextField
          label="Пароль"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={72}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint={`Не короче ${PASSWORD_MIN_LENGTH} символов`}
          error={violation('password')}
        />

        {commonError && error ? <Alert tone="error">{error.message}</Alert> : null}

        <Button type="submit" block disabled={pending}>
          {pending ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
        </Button>
      </form>

      <p className={styles.footer}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  );
}
