import { request } from 'shared/api';
import type { PolicyView } from 'shared/api';

/**
 * Действующая редакция политики. Ручка открыта всем: её номер форма
 * отправляет обратно при регистрации, а бэкенд сверяет с действующим —
 * согласие под текст, которого человек не видел, не считается.
 */
export function fetchPolicy(signal?: AbortSignal): Promise<PolicyView> {
  return request<PolicyView>('/api/privacy/policy', { signal });
}
