import { request } from 'shared/api';
import type { OrderView } from 'shared/api';

/**
 * Заказ создаётся по снимку лота: деньги покупателя уходят в эскроу,
 * товар выдаётся сразу, услуга ждёт продавца.
 */
export function placeOrder(offerId: string, quantity: number): Promise<OrderView> {
  return request<OrderView>('/api/orders', {
    method: 'POST',
    body: { offerId, quantity },
    auth: true,
  });
}
