import { request } from 'shared/api';
import type { OrderView } from 'shared/api';

export function fetchOrder(id: string, signal?: AbortSignal): Promise<OrderView> {
  return request<OrderView>(`/api/orders/${encodeURIComponent(id)}`, { auth: true, signal });
}
