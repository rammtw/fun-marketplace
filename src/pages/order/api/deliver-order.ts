import { request } from 'shared/api';
import type { OrderView } from 'shared/api';

/**
 * Продавец закрывает ручную выдачу. `note` — единственный канал до покупателя,
 * чата на площадке нет, поэтому пустую выдачу бэкенд не принимает (422).
 * В ответе — заказ целиком, перечитывать его отдельно не нужно.
 */
export function deliverOrder(id: string, note: string): Promise<OrderView> {
  return request<OrderView>(`/api/orders/${encodeURIComponent(id)}/deliver`, {
    method: 'POST',
    body: { note },
    auth: true,
  });
}
