/**
 * Схема атрибутов раздела приходит данными, а не типами: раздел описывает,
 * какие поля обязан заполнить продавец и что в них допустимо. Бэкенд сверяет
 * значения строго по типам (int — число, bool — булево), поэтому форма собирает
 * payload сама, а не шлёт строки из инпутов.
 *
 * Формат поля: имя => { type: 'int' | 'string' | 'bool' | 'enum', values, required }.
 */

export type AttributeType = 'int' | 'string' | 'bool' | 'enum';

export interface AttributeField {
  name: string;
  type: AttributeType;
  required: boolean;
  /** Допустимые значения для enum, как они пришли в схеме. */
  values: unknown[];
}

/** Сырые значения формы: строка из инпута или галочка. */
export type AttributeDraft = Record<string, string | boolean>;

function readType(raw: unknown): AttributeType {
  return raw === 'int' || raw === 'bool' || raw === 'enum' ? raw : 'string';
}

export function readAttributeSchema(schema: Record<string, unknown> | undefined): AttributeField[] {
  if (!schema) {
    return [];
  }

  return Object.entries(schema).map(([name, rule]) => {
    const definition = (rule ?? {}) as Record<string, unknown>;

    return {
      name,
      type: readType(definition.type),
      required: definition.required === true,
      values: Array.isArray(definition.values) ? definition.values : [],
    };
  });
}

/**
 * Значения заведённого лота — в состояние формы. Схема для этого не нужна:
 * булево остаётся булевым, остальное показывается строкой.
 */
export function draftFromAttributes(attributes: Record<string, unknown>): AttributeDraft {
  const draft: AttributeDraft = {};

  Object.entries(attributes).forEach(([name, value]) => {
    draft[name] =
      typeof value === 'boolean' ? value : value === null || value === undefined ? '' : String(value);
  });

  return draft;
}

export interface BuiltAttributes {
  attributes: Record<string, unknown>;
  errors: Record<string, string>;
}

/**
 * Состояние формы — в payload. Незаполненное необязательное поле не отправляется
 * вовсе: пустая строка вместо числа — это 422, а не «значения нет».
 */
export function buildAttributes(fields: AttributeField[], draft: AttributeDraft): BuiltAttributes {
  const attributes: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  fields.forEach((field) => {
    const raw = draft[field.name];

    if (field.type === 'bool') {
      attributes[field.name] = raw === true;
      return;
    }

    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value === '') {
      if (field.required) {
        errors[field.name] = 'Раздел требует это поле.';
      }
      return;
    }

    if (field.type === 'int') {
      const parsed = Number(value);
      if (!Number.isInteger(parsed)) {
        errors[field.name] = 'Нужно целое число.';
        return;
      }
      attributes[field.name] = parsed;
      return;
    }

    if (field.type === 'enum') {
      // Значение отправляем ровно таким, каким оно лежит в схеме: бэкенд
      // сравнивает строго, и «4000» вместо 4000 он не примет.
      const match = field.values.find((candidate) => String(candidate) === value);
      if (match === undefined) {
        errors[field.name] = 'Значение не из списка раздела.';
        return;
      }
      attributes[field.name] = match;
      return;
    }

    attributes[field.name] = value;
  });

  return { attributes, errors };
}

/** Строки текстового поля — в список единиц товара; пустые строки отбрасываются. */
export function readItems(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}
