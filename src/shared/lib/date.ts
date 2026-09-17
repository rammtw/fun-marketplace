// Форматтер дорогой в создании, а формат в проекте один.
const dateTime = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' });

/** Момент из ISO-строки бэкенда в местный человекочитаемый вид. */
export function formatDateTime(value: string): string {
  return dateTime.format(new Date(value));
}
