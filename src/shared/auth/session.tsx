import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ApiError, fetchCurrentUser, login as requestToken } from 'shared/api';
import type { UserView } from 'shared/api';
import { clearToken, getToken, setToken } from './token';

type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

interface Session {
  user: UserView | null;
  status: SessionStatus;
  signIn: (email: string, password: string) => Promise<UserView>;
  signOut: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserView | null>(null);
  // Токен в localStorage мог протухнуть, поэтому стартуем в loading и
  // спрашиваем /api/auth/me — до ответа не знаем, вошли мы или нет.
  const [status, setStatus] = useState<SessionStatus>(() =>
    getToken() ? 'loading' : 'anonymous',
  );

  useEffect(() => {
    if (!getToken()) {
      return;
    }

    const controller = new AbortController();
    fetchCurrentUser(controller.signal)
      .then((current) => {
        setUser(current);
        setStatus('authenticated');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        // Сеть могла просто отвалиться — токен выбрасываем только когда его отверг сервер.
        if (error instanceof ApiError) {
          clearToken();
        }
        setStatus('anonymous');
      });

    return () => controller.abort();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { token } = await requestToken(email, password);
    setToken(token);
    try {
      const current = await fetchCurrentUser();
      setUser(current);
      setStatus('authenticated');
      return current;
    } catch (error) {
      clearToken();
      setStatus('anonymous');
      throw error;
    }
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<Session>(
    () => ({ user, status, signIn, signOut }),
    [user, status, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('useSession вызван вне SessionProvider');
  }

  return session;
}
