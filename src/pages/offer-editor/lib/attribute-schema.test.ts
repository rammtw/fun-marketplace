import {
  buildAttributes,
  draftFromAttributes,
  readAttributeSchema,
  readItems,
} from './attribute-schema';

const schema = {
  mmr: { type: 'int', required: true },
  region: { type: 'enum', values: ['eu', 'cis'], required: true },
  comment: { type: 'string', required: false },
  verified: { type: 'bool', required: false },
};

const fields = readAttributeSchema(schema);

test('читает типы и обязательность из схемы раздела', () => {
  expect(fields).toEqual([
    { name: 'mmr', type: 'int', required: true, values: [] },
    { name: 'region', type: 'enum', required: true, values: ['eu', 'cis'] },
    { name: 'comment', type: 'string', required: false, values: [] },
    { name: 'verified', type: 'bool', required: false, values: [] },
  ]);
});

test('собирает значения с типами, которых ждёт бэкенд', () => {
  const built = buildAttributes(fields, {
    mmr: '5800',
    region: 'cis',
    comment: ' без шеринга ',
    verified: true,
  });

  expect(built.errors).toEqual({});
  expect(built.attributes).toEqual({
    mmr: 5800,
    region: 'cis',
    comment: 'без шеринга',
    verified: true,
  });
});

test('незаполненное необязательное поле не отправляется вовсе', () => {
  const built = buildAttributes(fields, { mmr: '100', region: 'eu', comment: '' });

  expect(built.errors).toEqual({});
  expect(Object.keys(built.attributes)).toEqual(['mmr', 'region', 'verified']);
});

test('ловит незаполненное обязательное и нецелое число до запроса', () => {
  const built = buildAttributes(fields, { mmr: '58.5', region: '' });

  expect(built.errors.mmr).toBe('Нужно целое число.');
  expect(built.errors.region).toBe('Раздел требует это поле.');
});

test('значение enum уходит ровно таким, как в схеме', () => {
  const numeric = readAttributeSchema({ tier: { type: 'enum', values: [10, 20] } });

  expect(buildAttributes(numeric, { tier: '20' }).attributes).toEqual({ tier: 20 });
});

test('значения лота превращаются в состояние формы', () => {
  expect(draftFromAttributes({ mmr: 5800, verified: true, note: null })).toEqual({
    mmr: '5800',
    verified: true,
    note: '',
  });
});

test('единицы товара читаются построчно, пустые строки отбрасываются', () => {
  expect(readItems(' KEY-1 \n\n KEY-2\n')).toEqual(['KEY-1', 'KEY-2']);
});
