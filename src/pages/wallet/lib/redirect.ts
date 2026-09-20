/**
 * Уход на страницу оплаты провайдера. Вынесено отдельной функцией, чтобы тест
 * мог её подменить: jsdom настоящую навигацию не умеет.
 */
export function redirectTo(url: string): void {
  window.location.assign(url);
}
