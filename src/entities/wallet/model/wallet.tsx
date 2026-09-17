import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ApiError, fetchWallet } from 'shared/api';
import type { WalletView } from 'shared/api';
import { useSession } from 'shared/auth';

interface WalletState {
  balance: WalletView | null;
  loading: boolean;
  error: Error | null;
  /** Перечитать баланс с сервера — после покупки. */
  refresh: () => void;
  /** Положить баланс из ответа ручки, которая его вернула, — после пополнения. */
  apply: (wallet: WalletView) => void;
}

const WalletContext = createContext<WalletState | null>(null);

/**
 * Баланс показывают шапка, панель покупки и страница кошелька, и после каждой
 * покупки или пополнения он меняется. Поэтому он живёт в одном месте, а не
 * загружается каждым экраном отдельно — иначе в шапке остаются старые деньги.
 */
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [balance, setBalance] = useState<WalletView | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status !== 'authenticated') {
      // Вышли из аккаунта — чужой баланс на экране висеть не должен.
      setBalance(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetchWallet(controller.signal)
      .then((wallet) => {
        setBalance(wallet);
        setError(null);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') {
          return;
        }
        setError(cause instanceof Error ? cause : new ApiError(0, String(cause)));
        setLoading(false);
      });

    return () => controller.abort();
  }, [status, attempt]);

  const refresh = useCallback(() => setAttempt((previous) => previous + 1), []);
  const apply = useCallback((wallet: WalletView) => {
    setBalance(wallet);
    setError(null);
  }, []);

  const value = useMemo<WalletState>(
    () => ({ balance, loading, error, refresh, apply }),
    [balance, loading, error, refresh, apply],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const wallet = useContext(WalletContext);
  if (!wallet) {
    throw new Error('useWallet вызван вне WalletProvider');
  }

  return wallet;
}
