const TOKEN_KEY = 'universe.token';

/**
 * Хранилище JWT. Отдельный файл, а не часть публичного API слайса: его читает
 * http-клиент из shared/api, и через index.ts вышла бы циклическая зависимость.
 */

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // Приватный режим или заблокированные куки: живём без «запомнить меня».
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* см. getToken */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* см. getToken */
  }
}
