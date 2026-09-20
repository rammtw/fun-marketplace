import type { PolicyView } from './contract';
import { request } from './client';

/**
 * Действующая редакция политики обработки персональных данных. Ручка открыта
 * всем: текст читают со страницы `/privacy`, а её номер форма регистрации
 * отправляет обратно — согласие под текст, которого человек не видел, не
 * считается информированным.
 */
export function fetchPolicy(signal?: AbortSignal): Promise<PolicyView> {
  return request<PolicyView>('/api/privacy/policy', { signal });
}
