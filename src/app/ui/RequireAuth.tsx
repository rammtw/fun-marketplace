import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSession } from 'shared/auth';
import { Spinner } from 'shared/ui/Spinner';

/**
 * Кошелёк и заказы закрыты токеном. Путь запоминаем, чтобы после входа
 * вернуть человека туда, куда он шёл.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const location = useLocation();

  if (status === 'loading') {
    return <Spinner label="Проверяем сессию…" />;
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <>{children}</>;
}
