import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useWallet } from 'entities/wallet';
import { fetchMyOffers } from 'shared/api';
import { useSession } from 'shared/auth';
import { formatMoney } from 'shared/lib';
import styles from './RootLayout.module.css';

export function RootLayout() {
  const { user, status, signOut } = useSession();
  const { balance } = useWallet();
  // «Продажи» — вход в рабочий стол продавца, и покупателю он ни о чём не говорит,
  // поэтому пункт появляется только у того, у кого есть хоть один лот.
  const [hasOffers, setHasOffers] = useState(false);
  const { pathname } = useLocation();
  // Перепроверяем на входе в рабочий стол и на выходе из него: первый лот заводится
  // именно там, и после него пункт должен появиться без перезагрузки страницы.
  const inWorkspace = pathname.startsWith('/my/offers');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Продажи и покупки — один маршрут /orders, различает их только ?role=seller.
  // NavLink сверяет путь без query и зажигал бы «Покупки» на продажах, поэтому
  // активный пункт считаем сами.
  const inSales = pathname === '/orders' && searchParams.get('role') === 'seller';
  const salesActive = inWorkspace || inSales;
  const purchasesActive =
    (pathname === '/orders' || pathname.startsWith('/orders/')) && !inSales;

  // Поиск живёт в адресе витрины, поэтому ссылкой на найденное можно поделиться.
  // На других страницах поле пустое: искать там нечего, набор текста уводит на витрину.
  const isStorefront = pathname === '/';
  const query = isStorefront ? searchParams.get('q') ?? '' : '';

  useEffect(() => {
    if (status !== 'authenticated') {
      setHasOffers(false);
      return;
    }

    const controller = new AbortController();
    fetchMyOffers(undefined, controller.signal)
      // Запрос вспомогательный: не ответил — оставляем шапку как была.
      .then((offers) => setHasOffers(offers.length > 0))
      .catch(() => undefined);

    return () => controller.abort();
  }, [status, user?.id, inWorkspace]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <Link className={styles.logo} to="/">
              <span className={styles.logoMark}>Universe</span> Market
            </Link>

            <input
              className={styles.search}
              type="search"
              aria-label="Поиск игр"
              placeholder="Поиск игр"
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                // Первый символ уводит на витрину обычным переходом, дальше правим
                // адрес на месте — иначе каждая буква оставалась бы в истории.
                navigate(value ? `/?q=${encodeURIComponent(value)}` : '/', {
                  replace: isStorefront,
                });
              }}
            />
          </div>

          <nav className={styles.nav}>
            {status === 'loading' ? <span className={styles.user}>…</span> : null}

            {status === 'authenticated' && user ? (
              <>
                {hasOffers ? (
                  <Link
                    to="/my/offers"
                    className={`${styles.navLink} ${salesActive ? styles.navLinkActive : ''}`}
                    aria-current={salesActive ? 'page' : undefined}
                  >
                    Продажи
                  </Link>
                ) : null}
                <Link
                  to="/orders"
                  className={`${styles.navLink} ${purchasesActive ? styles.navLinkActive : ''}`}
                  aria-current={purchasesActive ? 'page' : undefined}
                >
                  Покупки
                </Link>
                {/* Баланс — он же вход в кошелёк: две ссылки рядом были бы об одном. */}
                <NavLink
                  to="/wallet"
                  className={({ isActive }) =>
                    `${styles.balance} ${isActive ? styles.balanceActive : ''}`
                  }
                  title="Доступно на кошельке"
                >
                  {balance ? formatMoney(balance.available) : 'Кошелёк'}
                </NavLink>
                <span className={styles.user}>
                  <span className={styles.userName}>{user.displayName}</span>
                </span>
                <button type="button" className={styles.linkButton} onClick={signOut}>
                  Выйти
                </button>
              </>
            ) : null}

            {status === 'anonymous' ? (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                  }
                >
                  Войти
                </NavLink>
                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                  }
                >
                  Регистрация
                </NavLink>
              </>
            ) : null}
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>Площадка игровых товаров и услуг</footer>
    </div>
  );
}
