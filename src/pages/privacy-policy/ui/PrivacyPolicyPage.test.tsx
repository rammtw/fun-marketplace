import { render, screen } from '@testing-library/react';
import { installFetchMock, mockApi } from 'shared/api/test-fetch';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';

const policy = {
  version: '1.0',
  title: 'Политика обработки персональных данных',
  body: 'Оператор обрабатывает почту и псевдоним.',
  checksum: 'a1b2',
  publishedAt: '2026-01-01T00:00:00+00:00',
};

beforeEach(() => {
  installFetchMock();
});

test('показывает действующую редакцию целиком', async () => {
  mockApi({ 'GET /api/privacy/policy': [200, policy] });

  render(<PrivacyPolicyPage />);

  expect(await screen.findByRole('heading', { name: policy.title, level: 1 })).toBeInTheDocument();
  expect(screen.getByText(policy.body)).toBeInTheDocument();
  expect(screen.getByText(/Редакция 1\.0/)).toBeInTheDocument();
  // Контрольная сумма показана: по ней видно, что текст тот же, под которым подписывались.
  expect(screen.getByText(/a1b2/)).toBeInTheDocument();
});

test('упавшая ручка политики предлагает повторить', async () => {
  mockApi({ 'GET /api/privacy/policy': [500] });

  render(<PrivacyPolicyPage />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить политику');
  expect(screen.getByRole('button', { name: 'попробовать снова' })).toBeInTheDocument();
});
