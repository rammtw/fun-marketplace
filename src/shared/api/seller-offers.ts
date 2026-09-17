import type {
  CreateOfferRequest,
  OfferStatus,
  SellerOfferView,
  UpdateOfferRequest,
} from './contract';
import { request } from './client';

/**
 * Рабочий стол продавца. Чужой лот отвечает здесь так же, как несуществующий —
 * 404, поэтому «нет доступа» в интерфейсе не бывает.
 */

export function fetchMyOffers(
  status?: OfferStatus,
  signal?: AbortSignal,
): Promise<SellerOfferView[]> {
  return request<{ items?: SellerOfferView[] }>('/api/offers/mine', {
    auth: true,
    query: { status },
    signal,
  }).then((response) => response.items ?? []);
}

/** Лот рождается черновиком: на витрину его выводит отдельная правка со status=active. */
export function createOffer(payload: CreateOfferRequest): Promise<SellerOfferView> {
  return request<SellerOfferView>('/api/offers', { method: 'POST', body: payload, auth: true });
}

/** Переданные поля меняются, пропущенные остаются как были. */
export function updateOffer(id: string, payload: UpdateOfferRequest): Promise<SellerOfferView> {
  return request<SellerOfferView>(`/api/offers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
    auth: true,
  });
}

/** Удаление — это архив: на лот ссылаются заказы, и из истории он не исчезает. */
export function archiveOffer(id: string): Promise<void> {
  return request<void>(`/api/offers/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });
}

/** Единицы только добавляются: выданную покупателю удалить нельзя, она уже его. */
export function addStock(id: string, items: string[]): Promise<SellerOfferView> {
  return request<SellerOfferView>(`/api/offers/${encodeURIComponent(id)}/items`, {
    method: 'POST',
    body: { items },
    auth: true,
  });
}
