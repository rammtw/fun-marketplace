import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { placeOrder } from 'pages/offer/api/place-order';
import { ApiError, fetchWallet } from 'shared/api';
import type { Money, OfferDetails } from 'shared/api';
import { useSession } from 'shared/auth';
import { formatMoney, multiplyMoney, subtractMoney, useAsyncData } from 'shared/lib';
import { Alert } from 'shared/ui/Alert';
import { Button } from 'shared/ui/Button';
import { TextField } from 'shared/ui/TextField';
import styles from './OfferPage.module.css';

/** Сообщение под кнопкой: у каждого кода покупки свой сценарий, не общая «ошибка». */
function purchaseMessage(error: Error, missing: Money | null): string {
  if (!(error instanceof ApiError)) {
    return error.message;
  }

  switch (error.status) {
    case 402:
      // Бэкенд в этом случае отдаёт суммы в копейках — считаем сами и по-человечески.
      return missing
        ? `На кошельке не хватает ${formatMoney(missing)}.`
        : 'На кошельке не хватает денег.';
    case 403:
      return 'Это ваш собственный лот — купить его нельзя.';
    case 409:
      return `${error.message} Обновите страницу, чтобы увидеть актуальный остаток.`;
    default:
      return error.message;
  }
}

export function PurchasePanel({ offer }: { offer: OfferDetails }) {
  const { status, signOut } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const isGoods = typeof offer.stock === 'number';
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);

  const authenticated = status === 'authenticated';
  const wallet = useAsyncData(
    (signal) => (authenticated ? fetchWallet(signal) : Promise.resolve(null)),
    [authenticated],
  );

  const total = multiplyMoney(offer.price, quantity);
  const shortfall =
    wallet.data && wallet.data.available.amount < total.amount
      ? subtractMoney(total, wallet.data.available)
      : null;

  const handleBuy = useCallback(async () => {
    setPending(true);
    setError(null);

    try {
      const order = await placeOrder(offer.id, quantity);
      navigate(`/orders/${order.id}`);
    } catch (cause) {
      // Токен протух прямо посреди покупки — возвращаем на вход, а не показываем 401.
      if (cause instanceof ApiError && cause.status === 401) {
        signOut();
        navigate('/login', { state: { from: location.pathname } });
        return;
      }
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setPending(false);
    }
  }, [offer.id, quantity, navigate, signOut, location.pathname]);

  return (
    <aside className={styles.panel}>
      <div className={styles.price}>{formatMoney(offer.price)}</div>

      {!offer.isPurchasable ? (
        <Alert tone="info">Лот сейчас не продаётся.</Alert>
      ) : status === 'anonymous' ? (
        <>
          <p className={styles.note}>Чтобы купить лот, войдите — деньги спишутся с кошелька.</p>
          <Button block onClick={() => navigate('/login', { state: { from: location.pathname } })}>
            Войти и купить
          </Button>
        </>
      ) : (
        <>
          {isGoods && (offer.stock ?? 0) > 1 ? (
            <div className={styles.quantity}>
              <TextField
                label="Количество"
                type="number"
                min={1}
                max={offer.stock ?? 1}
                value={quantity}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  const max = offer.stock ?? 1;
                  setQuantity(Number.isFinite(next) ? Math.min(Math.max(next, 1), max) : 1);
                }}
              />
            </div>
          ) : null}

          {quantity > 1 ? (
            <div className={styles.row}>
              <span>Итого</span>
              <span className={styles.rowValue}>{formatMoney(total)}</span>
            </div>
          ) : null}

          <div className={styles.row}>
            <span>На кошельке</span>
            <span className={styles.rowValue}>
              {wallet.data ? formatMoney(wallet.data.available) : '…'}
            </span>
          </div>

          {shortfall ? (
            <Alert tone="info">
              Не хватает {formatMoney(shortfall)}.{' '}
              <Link className={styles.link} to={`/wallet?need=${shortfall.amount}`}>
                Пополнить кошелёк
              </Link>
            </Alert>
          ) : null}

          {error ? <Alert tone="error">{purchaseMessage(error, shortfall)}</Alert> : null}

          <Button block disabled={pending || status === 'loading'} onClick={handleBuy}>
            {pending ? 'Оформляем…' : 'Купить'}
          </Button>

          <p className={styles.note}>
            {offer.deliveryType === 'auto'
              ? 'Товар выдаётся сразу после оплаты.'
              : 'Деньги удерживаются в эскроу, пока продавец не выполнит заказ.'}
          </p>
        </>
      )}
    </aside>
  );
}
