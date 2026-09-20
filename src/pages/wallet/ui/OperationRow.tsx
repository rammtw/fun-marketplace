import { formatDateTime, formatMoney } from 'shared/lib';
import { Badge } from 'shared/ui/Badge';
import { type Operation, operationStatus, operationTitle } from '../lib/operations';
import styles from './WalletPage.module.css';

interface OperationRowProps {
  operation: Operation;
  busy: boolean;
  onCheck: (operation: Operation) => void;
}

export function OperationRow({ operation, busy, onCheck }: OperationRowProps) {
  const status = operationStatus(operation);

  return (
    <li className={styles.row}>
      <div>
        <span className={styles.rowTitle}>{operationTitle(operation)}</span>
        <span className={styles.rowMeta}>
          {formatDateTime(operation.createdAt)}
          {operation.cardLast4 ? ` · карта ···${operation.cardLast4}` : ''}
        </span>
      </div>

      <div className={styles.rowRight}>
        <span className={styles.rowAmount}>
          {operation.kind === 'deposit' ? '+' : '−'}
          {formatMoney(operation.amount)}
        </span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {operation.status === 'pending' ? (
        <div className={styles.rowActions}>
          {/* Адрес оплаты живёт у провайдера, так что это обычная ссылка наружу. */}
          {operation.confirmationUrl ? (
            <a className={styles.rowLink} href={operation.confirmationUrl}>
              Продолжить оплату
            </a>
          ) : null}
          <button
            type="button"
            className={styles.rowLink}
            disabled={busy}
            onClick={() => onCheck(operation)}
          >
            {busy ? 'Спрашиваем…' : 'Проверить статус'}
          </button>
        </div>
      ) : null}
    </li>
  );
}
