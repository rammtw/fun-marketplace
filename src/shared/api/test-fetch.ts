/** Заглушки fetch для тестов: клиент читает только ok, status и text(). */

type Reply = [status: number, payload?: unknown];

function respond([status, payload]: Reply) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(payload === undefined ? '' : JSON.stringify(payload)),
  });
}

export function installFetchMock(): void {
  global.fetch = jest.fn() as unknown as typeof fetch;
}

/** Следующий запрос — любой — получит этот ответ. */
export function mockFetchOnce(status: number, payload?: unknown): void {
  (global.fetch as jest.Mock).mockImplementationOnce(() => respond([status, payload]));
}

/**
 * Ответы по ручкам: ключ — «METHOD /path» без query. Порядок запросов при этом
 * не важен, а он зависит от порядка эффектов и на него закладываться не стоит.
 */
export function mockApi(routes: Record<string, Reply>): void {
  (global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const path = String(input).split('?')[0];
    const reply = routes[`${method} ${path}`];

    return reply
      ? respond(reply)
      : Promise.reject(new Error(`Нет заглушки для ${method} ${path}`));
  });
}

/** Последний URL запроса к ручке — чтобы проверить query-параметры. */
export function requestUrl(method: string, path: string): string | undefined {
  const calls = (global.fetch as jest.Mock).mock.calls.filter(
    ([input, init]) => String(input).split('?')[0] === path && (init?.method ?? 'GET') === method,
  );

  return calls.length > 0 ? String(calls[calls.length - 1][0]) : undefined;
}

/** Тело запроса к ручке — чтобы проверить, что ушло на бэкенд. */
export function requestBody(method: string, path: string): unknown {
  const call = (global.fetch as jest.Mock).mock.calls.find(
    ([input, init]) => String(input).split('?')[0] === path && (init?.method ?? 'GET') === method,
  );

  return call?.[1]?.body ? JSON.parse(call[1].body) : undefined;
}
