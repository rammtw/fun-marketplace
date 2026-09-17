import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { installFetchMock, mockApi, requestBody } from 'shared/api/test-fetch';
import { OfferEditorPage } from './OfferEditorPage';

const games = {
  items: [{ id: 21, slug: 'dota-2', title: 'Dota 2', platforms: ['pc'] }],
};

const game = {
  id: 21,
  slug: 'dota-2',
  title: 'Dota 2',
  platforms: ['pc'],
  sections: [
    {
      id: 53,
      title: 'Аккаунты',
      kind: 'goods',
      commissionBasisPoints: 700,
      attributeSchema: {
        mmr: { type: 'int', required: true },
        region: { type: 'enum', values: ['eu', 'cis'], required: true },
      },
    },
    {
      id: 54,
      title: 'Бустинг',
      kind: 'service',
      commissionBasisPoints: 1000,
      attributeSchema: {},
    },
  ],
};

const draft = {
  id: 'o-1',
  status: 'draft',
  title: 'Аккаунт Divine 5',
  description: 'Калибровка пройдена.',
  price: { amount: 1290000, currency: 'RUB' },
  deliveryType: 'auto',
  stock: 1,
  isPurchasable: false,
  attributes: { mmr: 5800, region: 'cis' },
  section: {
    id: 53,
    title: 'Аккаунты',
    kind: 'goods',
    commissionBasisPoints: 700,
    gameSlug: 'dota-2',
    gameTitle: 'Dota 2',
  },
  createdAt: '2026-09-17T12:00:00+00:00',
  updatedAt: '2026-09-17T12:00:00+00:00',
};

beforeEach(() => {
  installFetchMock();
  localStorage.setItem('universe.token', 'jwt-token');
});

function renderEditor(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/my/offers/new" element={<OfferEditorPage />} />
        <Route path="/my/offers/:id/edit" element={<OfferEditorPage />} />
        <Route path="/my/offers" element={<h1>Мои лоты</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

test('заводит товар с автовыдачей: цена в копейках, атрибуты по схеме, единицы списком', async () => {
  mockApi({
    'GET /api/games': [200, games],
    'GET /api/games/dota-2': [200, game],
    'POST /api/offers': [201, draft],
  });

  renderEditor('/my/offers/new');

  // Список игр приезжает запросом: пока его нет, в селекте только заглушка.
  await screen.findByRole('option', { name: 'Dota 2' });
  await userEvent.selectOptions(screen.getByLabelText('Игра'), 'dota-2');
  await userEvent.selectOptions(await screen.findByLabelText('Раздел'), '53');
  await userEvent.selectOptions(await screen.findByLabelText('Выдача'), 'auto');

  await userEvent.type(screen.getByLabelText('Заголовок'), 'Аккаунт Divine 5');
  await userEvent.type(screen.getByLabelText('Описание'), 'Калибровка пройдена.');
  await userEvent.type(screen.getByLabelText('Цена, ₽'), '12900');
  await userEvent.type(screen.getByLabelText('mmr *'), '5800');
  await userEvent.selectOptions(screen.getByLabelText('region *'), 'cis');
  await userEvent.type(screen.getByLabelText('По одной в строке'), 'KEY-1{enter}KEY-2');

  await userEvent.click(screen.getByRole('button', { name: 'Завести лот' }));

  await waitFor(() =>
    expect(requestBody('POST', '/api/offers')).toEqual({
      sectionId: 53,
      title: 'Аккаунт Divine 5',
      description: 'Калибровка пройдена.',
      price: 1290000,
      deliveryType: 'auto',
      attributes: { mmr: 5800, region: 'cis' },
      items: ['KEY-1', 'KEY-2'],
    }),
  );
  expect(await screen.findByRole('heading', { name: 'Мои лоты' })).toBeInTheDocument();
});

test('в разделе услуг автовыдачи нет', async () => {
  mockApi({ 'GET /api/games': [200, games], 'GET /api/games/dota-2': [200, game] });

  renderEditor('/my/offers/new');
  // Список игр приезжает запросом: пока его нет, в селекте только заглушка.
  await screen.findByRole('option', { name: 'Dota 2' });
  await userEvent.selectOptions(screen.getByLabelText('Игра'), 'dota-2');
  await userEvent.selectOptions(await screen.findByLabelText('Раздел'), '54');

  const delivery = await screen.findByLabelText('Выдача');
  expect(delivery).toBeDisabled();
  expect(delivery).toHaveValue('manual');
  expect(screen.queryByLabelText('По одной в строке')).not.toBeInTheDocument();
});

test('не даёт завести автовыдачу без единиц, не тратя запрос', async () => {
  mockApi({ 'GET /api/games': [200, games], 'GET /api/games/dota-2': [200, game] });

  renderEditor('/my/offers/new');
  // Список игр приезжает запросом: пока его нет, в селекте только заглушка.
  await screen.findByRole('option', { name: 'Dota 2' });
  await userEvent.selectOptions(screen.getByLabelText('Игра'), 'dota-2');
  await userEvent.selectOptions(await screen.findByLabelText('Раздел'), '53');
  await userEvent.selectOptions(await screen.findByLabelText('Выдача'), 'auto');
  await userEvent.type(screen.getByLabelText('Заголовок'), 'Аккаунт');
  await userEvent.type(screen.getByLabelText('Цена, ₽'), '100');
  await userEvent.type(screen.getByLabelText('mmr *'), '1000');
  await userEvent.selectOptions(screen.getByLabelText('region *'), 'eu');

  await userEvent.click(screen.getByRole('button', { name: 'Завести лот' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('заводится вместе с единицами');
  expect(requestBody('POST', '/api/offers')).toBeUndefined();
});

test('правка подставляет поля черновика и шлёт только их', async () => {
  mockApi({
    'GET /api/offers/mine': [200, { items: [draft] }],
    'GET /api/games/dota-2': [200, game],
    'PATCH /api/offers/o-1': [200, { ...draft, price: { amount: 990000, currency: 'RUB' } }],
  });

  renderEditor('/my/offers/o-1/edit');

  expect(await screen.findByLabelText('Заголовок')).toHaveValue('Аккаунт Divine 5');
  expect(screen.getByLabelText('Цена, ₽')).toHaveValue('12900');
  expect(await screen.findByLabelText('mmr *')).toHaveValue(5800);

  await userEvent.clear(screen.getByLabelText('Цена, ₽'));
  await userEvent.type(screen.getByLabelText('Цена, ₽'), '9900');
  await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

  await waitFor(() =>
    expect(requestBody('PATCH', '/api/offers/o-1')).toEqual({
      title: 'Аккаунт Divine 5',
      description: 'Калибровка пройдена.',
      price: 990000,
      attributes: { mmr: 5800, region: 'cis' },
    }),
  );
  expect(await screen.findByText('Лот сохранён.')).toBeInTheDocument();
});

test('публикация и архив лота живут рядом с формой', async () => {
  mockApi({
    'GET /api/offers/mine': [200, { items: [draft] }],
    'GET /api/games/dota-2': [200, game],
    'PATCH /api/offers/o-1': [200, { ...draft, status: 'active' }],
    'DELETE /api/offers/o-1': [204],
  });

  renderEditor('/my/offers/o-1/edit');
  await userEvent.click(await screen.findByRole('button', { name: 'Опубликовать' }));

  await waitFor(() => expect(requestBody('PATCH', '/api/offers/o-1')).toEqual({ status: 'active' }));

  await userEvent.click(screen.getByRole('button', { name: 'Убрать в архив' }));
  expect(await screen.findByRole('heading', { name: 'Мои лоты' })).toBeInTheDocument();
});

test('у лота с автовыдачей есть пополнение остатка', async () => {
  mockApi({
    'GET /api/offers/mine': [200, { items: [draft] }],
    'GET /api/games/dota-2': [200, game],
    'POST /api/offers/o-1/items': [200, { ...draft, stock: 3 }],
  });

  renderEditor('/my/offers/o-1/edit');
  await userEvent.type(await screen.findByLabelText('Новые единицы'), 'KEY-7{enter}KEY-8');
  await userEvent.click(screen.getByRole('button', { name: 'Пополнить остаток' }));

  await waitFor(() =>
    expect(requestBody('POST', '/api/offers/o-1/items')).toEqual({ items: ['KEY-7', 'KEY-8'] }),
  );
  expect(await screen.findByText('свободно: 3')).toBeInTheDocument();
});
