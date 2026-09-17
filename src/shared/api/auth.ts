import type { RegistrationRequest, UserView } from './contract';
import { request } from './client';

/**
 * Ручки аутентификации живут в shared: к ним обращается и хранилище сессии,
 * и страницы входа с регистрацией.
 */

export function login(email: string, password: string, signal?: AbortSignal): Promise<{ token: string }> {
  return request<{ token: string }>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    signal,
  });
}

export function fetchCurrentUser(signal?: AbortSignal): Promise<UserView> {
  return request<UserView>('/api/auth/me', { auth: true, signal });
}

export function register(payload: RegistrationRequest, signal?: AbortSignal): Promise<UserView> {
  return request<UserView>('/api/auth/register', { method: 'POST', body: payload, signal });
}

export function confirmEmail(token: string, signal?: AbortSignal): Promise<UserView> {
  return request<UserView>('/api/auth/confirm', { query: { token }, signal });
}

/** Отвечает 202 на любой адрес: по ответу нельзя узнать, есть ли такой аккаунт. */
export function resendConfirmation(email: string, signal?: AbortSignal): Promise<void> {
  return request<void>('/api/auth/resend-confirmation', {
    method: 'POST',
    body: { email },
    signal,
  });
}
