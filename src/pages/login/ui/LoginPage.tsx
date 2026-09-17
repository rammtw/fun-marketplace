import { type FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ApiError, resendConfirmation } from 'shared/api';
import { useSession } from 'shared/auth';
import { Alert } from 'shared/ui/Alert';
import { Button } from 'shared/ui/Button';
import { TextField } from 'shared/ui/TextField';
import styles from './AuthForm.module.css';

interface RedirectState {
  from?: string;
}

export function LoginPage() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [resent, setResent] = useState(false);
  const [pending, setPending] = useState(false);

  // 401 на входе — это и неверный пароль, и неподтверждённая почта: во втором
  // случае человеку нужна не «ошибка», а возможность переслать письмо.
  const mayNeedConfirmation = error instanceof ApiError && error.status === 401;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResent(false);

    try {
      await signIn(email, password);
      const state = location.state as RedirectState | null;
      navigate(state?.from ?? '/', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    setResent(false);
    try {
      await resendConfirmation(email);
      setResent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    }
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Вход</h1>
      <p className={styles.subtitle}>Войдите, чтобы покупать лоты и пополнять кошелёк.</p>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Почта"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Пароль"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error ? <Alert tone="error">{error.message}</Alert> : null}
        {resent ? (
          <Alert tone="success">Письмо отправлено заново, проверьте почту.</Alert>
        ) : null}

        <Button type="submit" block disabled={pending}>
          {pending ? 'Входим…' : 'Войти'}
        </Button>
      </form>

      {mayNeedConfirmation ? (
        <p className={styles.footer}>
          Не подтвердили почту?{' '}
          <button type="button" className={styles.linkButton} onClick={handleResend}>
            Выслать письмо заново
          </button>
        </p>
      ) : null}

      <p className={styles.footer}>
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </div>
  );
}
