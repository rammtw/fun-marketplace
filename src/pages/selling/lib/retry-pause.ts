import { useEffect, useState } from 'react';

/**
 * Пауза после неудачной попытки экзамена: без неё он сдаётся перебором.
 * Момент приходит с бэкенда (`retryAfter`), а таймер нужен только чтобы
 * разблокировать кнопку, не заставляя перезагружать страницу.
 */
export function useRetryPause(retryAfter: string | null | undefined): boolean {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!retryAfter) {
      return;
    }

    const left = new Date(retryAfter).getTime() - Date.now();
    if (left <= 0) {
      setNow(Date.now());
      return;
    }

    const timer = setTimeout(() => setNow(Date.now()), left);
    return () => clearTimeout(timer);
  }, [retryAfter]);

  return retryAfter ? new Date(retryAfter).getTime() > now : false;
}
