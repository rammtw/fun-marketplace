import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ApiError, acceptSellingRules, fetchAdmission, fetchSellingRules } from 'shared/api';
import type { AdmissionView } from 'shared/api';
import { useSession } from 'shared/auth';
import { formatDateTime, useAsyncData } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Button } from 'shared/ui/Button';
import { Checkbox } from 'shared/ui/Checkbox';
import { Spinner } from 'shared/ui/Spinner';
import { ExamDialog } from './ExamDialog';
import styles from './SellingPage.module.css';

/** Куда вернуть человека с допуском: сюда его завернул RequireSellingAdmission. */
const DEFAULT_NEXT = '/my/offers/new';

export function SellingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const next = (location.state as { from?: string } | null)?.from ?? DEFAULT_NEXT;

  const { status } = useSession();
  const authenticated = status === 'authenticated';

  const rules = useAsyncData(fetchSellingRules, []);
  const loaded = useAsyncData(
    (signal) => (authenticated ? fetchAdmission(signal) : Promise.resolve(null)),
    [authenticated],
  );
  // Свежий допуск приходит ответом на принятие правил и на сданный экзамен —
  // перезапрашивать его после каждого шага незачем.
  const [fresh, setFresh] = useState<AdmissionView | null>(null);
  const admission = fresh ?? loaded.data;

  const [checked, setChecked] = useState(false);
  const [acceptError, setAcceptError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);
  const [examOpen, setExamOpen] = useState(false);

  async function handleAccept() {
    if (!rules.data) {
      return;
    }

    setAcceptError(null);
    setPending(true);
    try {
      setFresh(await acceptSellingRules(rules.data.version));
    } catch (cause) {
      // 409 — правила переиздали, пока человек их читал: показываем новую
      // редакцию, принятое под старую не считается.
      if (cause instanceof ApiError && cause.status === 409) {
        setFresh(null);
        setChecked(false);
        rules.reload();
        loaded.reload();
        setAcceptError(
          new Error('Правила переиздали, пока вы читали: примите новую редакцию — вот она.'),
        );
      } else {
        setAcceptError(cause instanceof Error ? cause : new Error(String(cause)));
      }
    } finally {
      setPending(false);
    }
  }

  const canSell = admission?.canSell ?? false;
  const accepted = admission?.rulesAccepted ?? false;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Как начать продавать</h1>
      <p className={styles.subtitle}>
        Лоты заводит тот, кто принял правила площадки и сдал по ним короткий тест. Допуск выдаётся
        под редакцию правил: выйдет новая — правила принимаются и тест сдаётся заново, но уже
        опубликованных лотов и оформленных заказов это не отменяет.
      </p>

      {canSell && admission ? (
        <Alert tone="success">
          Допуск есть: правила редакции {admission.rulesVersion} приняты, тест сдан
          {admission.passedAt ? ` ${formatDateTime(admission.passedAt)}` : ''}.{' '}
          <Link to={next}>Завести лот</Link>
        </Alert>
      ) : null}

      {!authenticated && status !== 'loading' ? (
        <Alert tone="info">
          Правила открыты всем, а допуск выдаётся аккаунту: <Link to="/login">войдите</Link> или{' '}
          <Link to="/register">зарегистрируйтесь</Link>, чтобы принять их и сдать тест.
        </Alert>
      ) : null}

      {rules.loading ? <Spinner label="Загружаем правила…" /> : null}
      {rules.error && !rules.data ? (
        <Alert tone="error">
          Не удалось загрузить правила продажи:{' '}
          <button type="button" className={styles.linkButton} onClick={rules.reload}>
            попробовать снова
          </button>
        </Alert>
      ) : null}
      {loaded.error ? <Alert tone="error">{loaded.error.message}</Alert> : null}

      {rules.data ? (
        <section className={styles.card}>
          <header className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Шаг 1. Правила</h2>
            <span className={styles.version}>
              {rules.data.title} — редакция {rules.data.version} от{' '}
              {formatDateTime(rules.data.publishedAt)}
            </span>
          </header>

          <div className={styles.rules}>{rules.data.body}</div>

          {accepted && admission ? (
            <Alert tone="success">
              Правила редакции {admission.rulesVersion} приняты
              {admission.acceptedAt ? ` ${formatDateTime(admission.acceptedAt)}` : ''}.
            </Alert>
          ) : (
            <div className={styles.accept}>
              <Checkbox
                label={`Я прочитал правила и принимаю их (редакция ${rules.data.version})`}
                checked={checked}
                disabled={!authenticated}
                onChange={(event) => setChecked(event.target.checked)}
              />
              <Button onClick={handleAccept} disabled={!checked || pending || !authenticated}>
                {pending ? 'Принимаем…' : 'Принять правила'}
              </Button>
            </div>
          )}

          {acceptError ? <Alert tone="error">{acceptError.message}</Alert> : null}
        </section>
      ) : null}

      {rules.data ? (
        <section className={styles.card}>
          <header className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Шаг 2. Тест по правилам</h2>
            <span className={styles.version}>
              вопросов: {rules.data.questionsCount}, ошибаться нельзя
            </span>
          </header>

          <p className={styles.note}>
            Вопросы — про эскроу, комиссию, выдачу и запреты: почти все споры на площадке начинаются
            с правила, которого продавец не прочитал. Не сдали — попытка повторится через минуту.
          </p>

          {!canSell ? (
            <div className={styles.accept}>
              <Button onClick={() => setExamOpen(true)} disabled={!accepted}>
                Пройти тест
              </Button>
              {!accepted ? (
                <span className={styles.note}>Тест открывается после принятия правил.</span>
              ) : null}
              {admission && admission.attempts > 0 ? (
                <span className={styles.note}>Попыток: {admission.attempts}</span>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {examOpen ? (
        <ExamDialog
          onClose={() => setExamOpen(false)}
          onPassed={(result) => {
            setExamOpen(false);
            // Сданный экзамен сразу даёт canSell — форму лота открываем, не
            // перезапрашивая допуск.
            setFresh((previous) =>
              previous ? { ...previous, examPassed: true, canSell: result.canSell } : previous,
            );
            navigate(next, { replace: true });
          }}
        />
      ) : null}
    </div>
  );
}
