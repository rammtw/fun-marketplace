import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { fetchAdmission } from 'shared/api';
import { useAsyncData } from 'shared/lib';
import { Spinner } from 'shared/ui/Spinner';

/**
 * Лот заводит тот, у кого есть допуск: правила приняты и тест по действующей
 * редакции сдан. Бэкенд отвечает на это 403 уже при отправке формы — спрашиваем
 * раньше, чтобы её не заполняли впустую. Проверка стоит перед каждым открытием
 * формы, а не однажды: новая редакция правил гасит допуск всем сразу.
 */
export function RequireSellingAdmission({ children }: { children: ReactNode }) {
  const admission = useAsyncData(fetchAdmission, []);
  const location = useLocation();

  if (admission.loading) {
    return <Spinner label="Проверяем допуск к продаже…" />;
  }

  if (admission.data && !admission.data.canSell) {
    return (
      <Navigate
        to="/selling"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  // Допуск не ответил — пускаем в форму: отказ по делу всё равно придёт с бэкенда.
  return <>{children}</>;
}
