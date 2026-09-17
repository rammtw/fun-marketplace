/**
 * В разработке путь остаётся относительным: запросы уходят на dev-сервер CRA,
 * а он проксирует их на бэкенд (`proxy` в package.json) — так не нужен CORS.
 * Для сборки под другой хост адрес задаётся REACT_APP_API_URL.
 */
export const API_BASE_URL = process.env.REACT_APP_API_URL ?? '';
