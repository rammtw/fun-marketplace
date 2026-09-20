import { fetchDeposit, fetchPayout } from 'shared/api';
import { asDeposit, asPayout, type Operation } from './operations';

/**
 * Спросить исход у бэкенда. Для пополнения это не только чтение: ручка статуса
 * сама сходит к провайдеру и зачислит деньги, если платёж прошёл.
 */
export async function checkOperation(operation: Operation, signal?: AbortSignal): Promise<Operation> {
  return operation.kind === 'deposit'
    ? asDeposit(await fetchDeposit(operation.id, signal))
    : asPayout(await fetchPayout(operation.id, signal));
}
