import { type DependencyList, useCallback, useEffect, useState } from 'react';

export interface AsyncData<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  reload: () => void;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * Загрузка данных на время жизни компонента: запрос отменяется при уходе со
 * страницы и при смене зависимостей, так что ответ устаревшего запроса не
 * перетирает свежий.
 */
export function useAsyncData<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
): AsyncData<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    loader(controller.signal)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (isAbort(cause)) {
          return;
        }
        setData(null);
        setError(cause instanceof Error ? cause : new Error(String(cause)));
        setLoading(false);
      });

    return () => controller.abort();
    // loader пересоздаётся на каждый рендер, поэтому зависимости задаёт вызывающий.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((previous) => previous + 1), []);

  return { data, error, loading, reload };
}
