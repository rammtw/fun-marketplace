import { API_BASE_URL } from 'shared/config';
import { getToken } from 'shared/auth/token';

/** Нарушение поля формы: бэкенд отдаёт их в `violations` problem+json. */
export interface FieldViolation {
  path: string;
  message: string;
}

/**
 * Ответ не 2xx. Код здесь важнее текста: у покупки и входа за каждым статусом
 * стоит свой сценарий, и разбирать их вызывающему нужно по `status`.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly violations: FieldViolation[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Нарушение по конкретному полю формы, если бэкенд его назвал. */
  violationOf(path: string): string | undefined {
    return this.violations.find((violation) => violation.path === path)?.message;
  }
}

/** Сеть не ответила: отличается от ApiError тем, что повтор имеет смысл. */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Не удалось связаться с сервером. Проверьте соединение и повторите.');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  signal?: AbortSignal;
  /** Токен нужен только приватным ручкам; публичные шлём без заголовка. */
  auth?: boolean;
}

function buildUrl(path: string, query: RequestOptions['query']): string {
  const url = `${API_BASE_URL}${path}`;
  if (!query) {
    return url;
  }

  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const queryString = search.toString();

  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Текст ошибки бэкенд кладёт в разные поля: lexik отдаёт `message`,
 * обработчик исключений Symfony — problem+json с `detail` и `violations`.
 */
function readError(status: number, payload: unknown): ApiError {
  const fallback = `Запрос завершился ошибкой ${status}.`;
  if (typeof payload !== 'object' || payload === null) {
    return new ApiError(status, fallback);
  }

  const body = payload as Record<string, unknown>;
  const rawViolations = Array.isArray(body.violations) ? body.violations : [];
  const violations: FieldViolation[] = rawViolations.map((violation) => {
    const item = violation as Record<string, unknown>;
    return {
      path: String(item.propertyPath ?? ''),
      message: String(item.title ?? item.message ?? ''),
    };
  });

  const message = [body.message, body.detail, body.title].find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate !== '',
  );

  return new ApiError(status, message ?? fallback, violations);
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === '') {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal, auth = false } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new NetworkError(error);
  }

  const payload = await readPayload(response);
  if (!response.ok) {
    throw readError(response.status, payload);
  }

  return payload as T;
}
