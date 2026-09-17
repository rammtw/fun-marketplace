import { Link, NavLink, Outlet } from 'react-router';
import { useSession } from 'shared/auth';
import styles from './RootLayout.module.css';

export function RootLayout() {
  const { user, status, signOut } = useSession();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.logo} to="/">
            <span className={styles.logoMark}>Universe</span> Market
          </Link>

          <nav className={styles.nav}>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              Игры
            </NavLink>

            {status === 'loading' ? <span className={styles.user}>…</span> : null}

            {status === 'authenticated' && user ? (
              <>
                <NavLink
                  to="/wallet"
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                  }
                >
                  Кошелёк
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
