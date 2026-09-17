import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useSession } from 'shared/auth';
import { Spinner } from 'shared/ui/Spinner';

/** Вошедшему на форме входа и регистрации делать нечего. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useSession();

  if (status === 'loading') {
    return <Spinner label="Проверяем сессию…" />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
