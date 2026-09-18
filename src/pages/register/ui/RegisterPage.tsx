import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { ApiError, register } from 'shared/api';
import type { PolicyView, UserView } from 'shared/api';
import { formatDateTime, useAsyncData } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Button } from 'shared/ui/Button';
import { Checkbox } from 'shared/ui/Checkbox';
import { Spinner } from 'shared/ui/Spinner';
import { TextField } from 'shared/ui/TextField';
import { fetchPolicy } from '../api/fetch-policy';
import styles from './AuthForm.module.css';

const PASSWORD_MIN_LENGTH = 8;

export function RegisterPage() {
  const loadedPolicy = useAsyncData(fetchPolicy, []);
  // Переизданную политику перечитываем сами, в обход загрузчика: её текст
  // нужно показать вместе с ошибкой, а не вместо формы со спиннером.
  const [reissuedPolicy, setReissuedPolicy] = useState<PolicyView | null>(null);
  const policy = reissuedPolicy ?? loadedPolicy.data;

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [personalDataConsent, setPersonalDataConsent] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [publicProfileConsent, setPublicProfileConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [missingConsent, setMissingConsent] = useState(false);
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
    if (!policy) {
      return;
    }

    // Обязательные согласия сторожим на месте: снятая галочка — это не ошибка
    // ввода, за которой стоит идти на бэкенд, а незаданный вопрос.
    if (!personalDataConsent || !isAdult) {
      setMissingConsent(true);
      setError(null);
      return;
    }

    setPending(true);
    setMissingConsent(false);
    setError(null);

    try {
      setCreated(
        await register({
          email,
          password,
          displayName,
          policyVersion: policy.version,
          personalDataConsent,
          isAdult,
          publicProfileConsent,
          marketingConsent,
        }),
      );
    } catch (cause) {
      setError(await explain(cause, policy.version));
    } finally {
      setPending(false);
    }
  }

  /**
   * 409 — это и занятая почта, и переизданная политика. Ответ пустой, так что
   * различаем по редакции: если действующая уже другая, согласие было дано под
   * снятый с публикации текст и его нужно взять заново под новый.
   */
  async function explain(cause: unknown, sentVersion: string): Promise<Error> {
    if (cause instanceof ApiError && cause.status === 409) {
      const fresh = await fetchPolicy().catch(() => null);
      if (fresh && fresh.version !== sentVersion) {
        setReissuedPolicy(fresh);
        setPersonalDataConsent(false);
        return new Error(
          `Политика изменилась, пока вы заполняли форму: теперь действует редакция ${fresh.version}. Прочитайте её и согласитесь заново.`,
        );
      }

      return new Error('Эта почта уже занята. Войдите или укажите другую.');
    }

    return cause instanceof Error ? cause : new Error(String(cause));
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
          hint="Псевдоним для витрины: настоящее имя не нужно"
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

        {loadedPolicy.loading ? <Spinner label="Загружаем политику…" /> : null}

        {loadedPolicy.error && !policy ? (
          <Alert tone="error">
            Не удалось загрузить политику обработки персональных данных, а без неё регистрация
            невозможна:{' '}
            <button type="button" className={styles.linkButton} onClick={loadedPolicy.reload}>
              попробовать снова
            </button>
          </Alert>
        ) : null}

        {policy ? (
          <fieldset className={styles.consents}>
            <legend className={styles.consentsTitle}>Персональные данные</legend>

            <details className={styles.policy}>
              <summary className={styles.policySummary}>
                {policy.title} — редакция {policy.version} от {formatDateTime(policy.publishedAt)}
              </summary>
              <div className={styles.policyBody}>{policy.body}</div>
            </details>

            <Checkbox
              label={`Даю согласие на обработку моих персональных данных на условиях политики (редакция ${policy.version})`}
              name="personalDataConsent"
              checked={personalDataConsent}
              onChange={(event) => setPersonalDataConsent(event.target.checked)}
              error={
                violation('personalDataConsent') ??
                violation('policyVersion') ??
                (missingConsent && !personalDataConsent ? 'Без согласия аккаунт не завести' : undefined)
              }
            />
            <Checkbox
              label="Мне есть 18 лет"
              name="isAdult"
              checked={isAdult}
              onChange={(event) => setIsAdult(event.target.checked)}
              error={
                violation('isAdult') ??
                (missingConsent && !isAdult ? 'Площадка работает только со взрослыми' : undefined)
              }
            />
            <Checkbox
              label="Показывать мой профиль в открытой части площадки"
              name="publicProfileConsent"
              checked={publicProfileConsent}
              onChange={(event) => setPublicProfileConsent(event.target.checked)}
              hint="По желанию: без этого согласия профиль не попадёт в публичные списки"
              error={violation('publicProfileConsent')}
            />
            <Checkbox
              label="Получать письма о новинках и акциях"
              name="marketingConsent"
              checked={marketingConsent}
              onChange={(event) => setMarketingConsent(event.target.checked)}
              hint="По желанию: письма о заказах приходят и без этого"
              error={violation('marketingConsent')}
            />
          </fieldset>
        ) : null}

        {commonError && error ? <Alert tone="error">{error.message}</Alert> : null}

        <Button type="submit" block disabled={pending || !policy}>
          {pending ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
        </Button>
      </form>

      <p className={styles.footer}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  );
}
