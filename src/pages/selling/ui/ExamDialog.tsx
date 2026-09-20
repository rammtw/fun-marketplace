import { useState } from 'react';
import { ApiError, fetchExam, takeExam } from 'shared/api';
import type { ExamResultView } from 'shared/api';
import { formatDateTime, useAsyncData } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Button } from 'shared/ui/Button';
import { Modal } from 'shared/ui/Modal';
import { Spinner } from 'shared/ui/Spinner';
import { useRetryPause } from '../lib/retry-pause';
import styles from './ExamDialog.module.css';

interface ExamDialogProps {
  onClose: () => void;
  onPassed: (result: ExamResultView) => void;
}

/**
 * Экзамен по правилам. Верных вариантов в вопросах нет — ответы проверяет
 * бэкенд, и несданный экзамен отвечает не разбором, а пунктами на перечитать.
 */
export function ExamDialog({ onClose, onPassed }: ExamDialogProps) {
  const exam = useAsyncData(fetchExam, []);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ExamResultView | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);

  const questions = exam.data?.questions ?? [];
  const answered = questions.filter((question) => question.id in answers).length;
  const waiting = useRetryPause(result?.retryAfter);

  async function handleSubmit() {
    // Недоотвеченный экзамен бэкенд отвергнет 422 — сторожим на месте.
    if (answered < questions.length) {
      setError(new Error('Ответьте на все вопросы: экзамен засчитывается только целиком.'));
      return;
    }

    setError(null);
    setPending(true);
    try {
      const outcome = await takeExam(answers);
      setResult(outcome);
      if (outcome.passed) {
        onPassed(outcome);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setPending(false);
    }
  }

  function retry() {
    setAnswers({});
    setResult(null);
    setError(null);
  }

  const failed = result && !result.passed;
  const rulesNotAccepted = exam.error instanceof ApiError && exam.error.status === 409;

  return (
    <Modal
      title="Тест по правилам продажи"
      onClose={onClose}
      footer={
        failed ? (
          <>
            <Button onClick={retry} disabled={waiting}>
              Пройти ещё раз
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Вернуться к правилам
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleSubmit} disabled={pending || exam.data === null}>
              {pending ? 'Проверяем…' : 'Ответить'}
            </Button>
            <span className={styles.progress}>
              Отвечено {answered} из {questions.length}
            </span>
          </>
        )
      }
    >
      {exam.loading ? <Spinner label="Загружаем вопросы…" /> : null}

      {rulesNotAccepted ? (
        <Alert tone="error">Правила ещё не приняты — примите их, и тест откроется.</Alert>
      ) : null}
      {exam.error && !rulesNotAccepted ? <Alert tone="error">{exam.error.message}</Alert> : null}

      {failed && result ? (
        <div className={styles.result}>
          <Alert tone="error">
            Тест не сдан: верно {result.correct} из {result.total}. Ошибаться нельзя ни в одном
            вопросе.
          </Alert>
          {result.clausesToReview.length > 0 ? (
            <>
              <p className={styles.reviewTitle}>Перечитайте пункты правил:</p>
              <ul className={styles.clauses}>
                {result.clausesToReview.map((clause) => (
                  <li key={clause}>{clause}</li>
                ))}
              </ul>
            </>
          ) : null}
          {waiting && result.retryAfter ? (
            <p className={styles.hint}>
              Следующая попытка — после {formatDateTime(result.retryAfter)}: пауза стоит, чтобы
              тест не сдавали перебором.
            </p>
          ) : null}
        </div>
      ) : null}

      {!failed && exam.data ? (
        <ol className={styles.questions}>
          {exam.data.questions.map((question) => (
            <li key={question.id} className={styles.question}>
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>
                  {question.text} <span className={styles.clause}>пункт {question.clause}</span>
                </legend>
                {question.options.map((option, index) => (
                  <label key={option} className={styles.option}>
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === index}
                      onChange={() =>
                        setAnswers((previous) => ({ ...previous, [question.id]: index }))
                      }
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </fieldset>
            </li>
          ))}
        </ol>
      ) : null}

      {error ? <Alert tone="error">{error.message}</Alert> : null}
    </Modal>
  );
}
