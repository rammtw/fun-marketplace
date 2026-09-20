import { type ReactNode, useEffect, useId, useRef } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Окно поверх страницы. Нативный <dialog> здесь не годится: jsdom из jest 27 не
 * умеет showModal, и окно осталось бы непроверяемым тестом.
 */
export function Modal({ title, onClose, children, footer }: ModalProps) {
  const titleId = useId();
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Фокус уводим в окно: иначе Tab продолжает ходить по странице за ним.
    windowRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    const scroll = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = scroll;
    };
  }, [onClose]);

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div
        ref={windowRef}
        className={styles.window}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        // Клик по самому окну до подложки не доходит: закрывает только фон.
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </header>

        <div className={styles.body}>{children}</div>

        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </div>
  );
}
