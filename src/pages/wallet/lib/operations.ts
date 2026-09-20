import type { DepositView, Money, PayoutView } from 'shared/api';

export type OperationKind = 'deposit' | 'payout';
export type OperationStatus = DepositView['status'];
export type StatusTone = 'neutral' | 'accent' | 'success';

/**
 * Пополнение и выплата — одно и то же движение денег в разные стороны, и в
 * истории кошелька они идут одним списком. Различаются двумя полями: у
 * пополнения есть адрес оплаты, у выплаты — хвост карты.
 */
export interface Operation {
  kind: OperationKind;
  id: string;
  amount: Money;
  status: OperationStatus;
  createdAt: string;
  completedAt?: string | null;
  cancellationReason?: string | null;
  confirmationUrl?: string | null;
  cardLast4?: string | null;
}

export function asDeposit(view: DepositView): Operation {
  return { kind: 'deposit', ...view };
}

export function asPayout(view: PayoutView): Operation {
  return { kind: 'payout', ...view };
}

/** Обе истории приходят свежими сверху; сливаем их, не ломая этот порядок. */
export function mergeOperations(deposits: DepositView[], payouts: PayoutView[]): Operation[] {
  return [...deposits.map(asDeposit), ...payouts.map(asPayout)].sort(
    (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt),
  );
}

const LABELS: Record<OperationKind, Record<OperationStatus, { label: string; tone: StatusTone }>> = {
  deposit: {
    pending: { label: 'Ждёт оплаты', tone: 'accent' },
    succeeded: { label: 'Зачислено', tone: 'success' },
    canceled: { label: 'Платёж не прошёл', tone: 'neutral' },
  },
  payout: {
    pending: { label: 'В пути', tone: 'accent' },
    succeeded: { label: 'Выплачено', tone: 'success' },
    canceled: { label: 'Отменено, деньги на месте', tone: 'neutral' },
  },
};

export function operationStatus(operation: Operation): { label: string; tone: StatusTone } {
  return LABELS[operation.kind][operation.status];
}

export function operationTitle(operation: Operation): string {
  return operation.kind === 'deposit' ? 'Пополнение' : 'Вывод на карту';
}
