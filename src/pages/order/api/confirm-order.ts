import { request } from 'shared/api';
import type { OrderView } from 'shared/api';

/**
 * Покупатель подтверждает получение: сделка закрывается, эскроу уходит продавцу.
 * Необратимо — после подтверждения спор по заказу уже не открыть.
 * В ответе — заказ целиком, перечитывать его отдельно не нужно.
 */
export function confirmOrder(id: string): Promise<OrderView> {
  return request<OrderView>(`/api/orders/${encodeURIComponent(id)}/confirm`, {
    method: 'POST',
    auth: true,
  });
}
