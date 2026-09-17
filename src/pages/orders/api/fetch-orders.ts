import { request } from 'shared/api';
import type { OrderStatus, OrderSummary } from 'shared/api';

export type OrderRole = 'buyer' | 'seller';

export interface OrdersQuery {
  role: OrderRole;
  status?: OrderStatus;
  page: number;
}

export interface OrdersPage {
  items: OrderSummary[];
  page: number;
  perPage: number;
  total: number;
}

export const ORDERS_PER_PAGE = 20;

/** Покупки владельца токена, свежие сверху; продажи — та же ручка с role=seller. */
export function fetchOrders(query: OrdersQuery, signal?: AbortSignal): Promise<OrdersPage> {
  return request<OrdersPage>('/api/orders', {
    auth: true,
    signal,
    query: {
      role: query.role,
      status: query.status,
      page: query.page,
      perPage: ORDERS_PER_PAGE,
    },
  });
}
