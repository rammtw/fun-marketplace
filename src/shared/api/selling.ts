import type { AdmissionView, ExamResultView, ExamView, RulesView } from './contract';
import { request } from './client';

/**
 * Допуск к продаже. Правила принимаются и экзамен сдаётся под номер редакции,
 * а новая редакция гасит допуск всем — поэтому допуск спрашивают перед каждым
 * заведением лота, а не однажды при первом. Сами правила открыты всем: их
 * читают до того, как решают продавать.
 */

export function fetchSellingRules(signal?: AbortSignal): Promise<RulesView> {
  return request<RulesView>('/api/selling/rules', { signal });
}

export function fetchAdmission(signal?: AbortSignal): Promise<AdmissionView> {
  return request<AdmissionView>('/api/selling/admission', { auth: true, signal });
}

/**
 * Галочка под правилами. Редакция уезжает обратно, чтобы бэкенд сверил её с
 * действующей: принятое под снятый с публикации текст не считается (409).
 * Допуска это ещё не даёт — дальше экзамен.
 */
export function acceptSellingRules(version: string): Promise<AdmissionView> {
  return request<AdmissionView>('/api/selling/admission', {
    method: 'POST',
    body: { version, accepted: true },
    auth: true,
  });
}

/** Вопросы без верных вариантов: ответы проверяет площадка. 409 — правила ещё не приняты. */
export function fetchExam(signal?: AbortSignal): Promise<ExamView> {
  return request<ExamView>('/api/selling/exam', { auth: true, signal });
}

/**
 * Ответы — номер выбранного варианта по идентификатору вопроса. Сдан только без
 * единой ошибки; 429 значит, что не вышла пауза после неудачной попытки.
 */
export function takeExam(answers: Record<string, number>): Promise<ExamResultView> {
  return request<ExamResultView>('/api/selling/exam', {
    method: 'POST',
    body: { answers },
    auth: true,
  });
}
