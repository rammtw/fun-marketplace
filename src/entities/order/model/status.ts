import type { OrderStatus } from 'shared/api';

export type StatusTone = 'neutral' | 'accent' | 'success';

/**
 * Словарь статусов заказа: его читают и карточка заказа, и список заказов,
 * а меняется он вместе с доменом, а не с экраном.
 */
const LABELS: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  placed: { label: 'Создан', tone: 'accent' },
  paid: { label: 'Оплачен', tone: 'accent' },
  delivered: { label: 'Выдан', tone: 'success' },
  completed: { label: 'Завершён', tone: 'success' },
  cancelled: { label: 'Отменён', tone: 'neutral' },
  disputed: { label: 'Спор', tone: 'neutral' },
  refunded: { label: 'Возвращён', tone: 'neutral' },
};

export const ORDER_STATUSES = Object.keys(LABELS) as OrderStatus[];

export function orderStatus(status: OrderStatus): { label: string; tone: StatusTone } {
  return LABELS[status];
}
