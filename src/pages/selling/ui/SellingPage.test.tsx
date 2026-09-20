import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { installFetchMock, mockApi, requestBody } from 'shared/api/test-fetch';
import { SessionProvider } from 'shared/auth';
import { SellingPage } from './SellingPage';

const me = {
  id: 'u-1',
  displayName: 'Продавец',
  status: 'active',
  registeredAt: '2026-01-01T00:00:00+00:00',
};

const rules = {
  version: '1.0',
  title: 'Правила продажи и публикации',
  body: '5.2. Комиссия удерживается с продавца при выплате.',
  checksum: 'sha256:abc',
  questionsCount: 2,
  publishedAt: '2026-09-01T10:00:00+00:00',
};

/** Допуск под действующую редакцию: ничего не принято и не сдано. */
const blank = {
  rulesVersion: '1.0',
  rulesAccepted: false,
  examPassed: false,
  canSell: false,
  attempts: 0,
  acceptedAt: null,
  passedAt: null,
  retryAfter: null,
};

const accepted = {
  ...blank,
  rulesAccepted: true,
  acceptedAt: '2026-09-20T09:00:00+00:00',
};

const exam = {
  rulesVersion: '1.0',
  questions: [
    {
      id: 'escrow',
      clause: '5.3',
      text: 'Когда продавец получит деньги за заказ?',
      options: ['Сразу после оплаты', 'После подтверждения заказа покупателем'],
    },
    {
      id: 'commission',
      clause: '5.2',
      text: 'Комиссия раздела 700 базисных пунктов — это сколько и с кого?',
      options: ['7 % с продавца при выплате', '700 рублей с каждого заказа'],
    },
  ],
};

beforeEach(() => {
  installFetchMock();
  localStorage.clear();
  localStorage.setItem('universe.token', 'jwt-token');
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/selling']}>
      <SessionProvider>
        <Routes>
          <Route path="/selling" element={<SellingPage />} />
          <Route path="/my/offers/new" element={<h1>Новый лот</h1>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

test('правила принимаются, тест сдаётся в модалке и открывает форму лота', async () => {
  mockApi({
    'GET /api/auth/me': [200, me],
    'GET /api/selling/rules': [200, rules],
    'GET /api/selling/admission': [200, blank],
    'POST /api/selling/admission': [201, accepted],
    'GET /api/selling/exam': [200, exam],
    'POST /api/selling/exam': [
      200,
      { passed: true, correct: 2, total: 2, clausesToReview: [], canSell: true, attempts: 1 },
    ],
  });

  renderPage();

  await userEvent.click(await screen.findByLabelText(/принимаю их \(редакция 1\.0\)/));
  await userEvent.click(screen.getByRole('button', { name: 'Принять правила' }));

  // Редакция уезжает обратно: согласие под снятый с публикации текст не считается.
  expect(await screen.findByText(/Правила редакции 1\.0 приняты/)).toBeInTheDocument();
  expect(requestBody('POST', '/api/selling/admission')).toEqual({
    version: '1.0',
    accepted: true,
  });

  await userEvent.click(screen.getByRole('button', { name: 'Пройти тест' }));

  const dialog = within(await screen.findByRole('dialog'));
  expect(await dialog.findByText(/пункт 5\.3/)).toBeInTheDocument();
  await userEvent.click(dialog.getByLabelText('После подтверждения заказа покупателем'));
  await userEvent.click(dialog.getByLabelText('7 % с продавца при выплате'));
  await userEvent.click(dialog.getByRole('button', { name: 'Ответить' }));

  expect(await screen.findByRole('heading', { name: 'Новый лот' })).toBeInTheDocument();
  expect(requestBody('POST', '/api/selling/exam')).toEqual({
    answers: { escrow: 1, commission: 0 },
  });
});

test('несданный тест называет пункты на перечитать и держит паузу', async () => {
  const retryAfter = new Date(Date.now() + 60_000).toISOString();
  mockApi({
    'GET /api/auth/me': [200, me],
    'GET /api/selling/rules': [200, rules],
    'GET /api/selling/admission': [200, accepted],
    'GET /api/selling/exam': [200, exam],
    'POST /api/selling/exam': [
      200,
      {
        passed: false,
        correct: 1,
        total: 2,
        clausesToReview: ['5.3'],
        canSell: false,
        attempts: 1,
        retryAfter,
      },
    ],
  });

  renderPage();

  await screen.findByText(/Правила редакции 1\.0 приняты/);
  await userEvent.click(screen.getByRole('button', { name: 'Пройти тест' }));

  const dialog = within(await screen.findByRole('dialog'));
  await userEvent.click(await dialog.findByLabelText('Сразу после оплаты'));
  await userEvent.click(dialog.getByLabelText('7 % с продавца при выплате'));
  await userEvent.click(dialog.getByRole('button', { name: 'Ответить' }));

  // Разбора вопросов бэкенд не даёт и не даст: наружу уезжают пункты правил.
  expect(await screen.findByText(/верно 1 из 2/)).toBeInTheDocument();
  expect(screen.getByText('5.3')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Пройти ещё раз' })).toBeDisabled();
  expect(screen.queryByRole('heading', { name: 'Новый лот' })).not.toBeInTheDocument();
});

test('недоотвеченный тест на бэкенд не уходит', async () => {
  mockApi({
    'GET /api/auth/me': [200, me],
    'GET /api/selling/rules': [200, rules],
    'GET /api/selling/admission': [200, accepted],
    'GET /api/selling/exam': [200, exam],
  });

  renderPage();

  await screen.findByText(/Правила редакции 1\.0 приняты/);
  await userEvent.click(screen.getByRole('button', { name: 'Пройти тест' }));

  const dialog = within(await screen.findByRole('dialog'));
  await userEvent.click(await dialog.findByLabelText('Сразу после оплаты'));
  await userEvent.click(dialog.getByRole('button', { name: 'Ответить' }));

  expect(await dialog.findByText(/Ответьте на все вопросы/)).toBeInTheDocument();
  expect(requestBody('POST', '/api/selling/exam')).toBeUndefined();
});

test('до принятия правил тест не открывается', async () => {
  mockApi({
    'GET /api/auth/me': [200, me],
    'GET /api/selling/rules': [200, rules],
    'GET /api/selling/admission': [200, blank],
  });

  renderPage();

  expect(await screen.findByRole('button', { name: 'Пройти тест' })).toBeDisabled();
  expect(screen.getByText('Тест открывается после принятия правил.')).toBeInTheDocument();
});

test('с допуском страница ведёт прямо в форму лота', async () => {
  mockApi({
    'GET /api/auth/me': [200, me],
    'GET /api/selling/rules': [200, rules],
    'GET /api/selling/admission': [
      200,
      { ...accepted, examPassed: true, canSell: true, passedAt: '2026-09-20T09:30:00+00:00' },
    ],
  });

  renderPage();

  expect(await screen.findByRole('link', { name: 'Завести лот' })).toHaveAttribute(
    'href',
    '/my/offers/new',
  );
  expect(screen.queryByRole('button', { name: 'Пройти тест' })).not.toBeInTheDocument();
});
