import { BrowserRouter, Route, Routes } from 'react-router';
import { SessionProvider } from 'shared/auth';
import { GamesPage } from 'pages/games';
import { GamePage } from 'pages/game';
import { LoginPage } from 'pages/login';
import { RegisterPage } from 'pages/register';
import { ConfirmEmailPage } from 'pages/confirm-email';
import { OfferPage } from 'pages/offer';
import { OrderPage } from 'pages/order';
import { WalletPage } from 'pages/wallet';
import { NotFoundPage } from 'pages/not-found';
import { GuestOnly } from './ui/GuestOnly';
import { RequireAuth } from './ui/RequireAuth';
import { RootLayout } from './ui/RootLayout';
import './styles/global.css';

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<GamesPage />} />
            <Route path="games/:slug" element={<GamePage />} />
            <Route path="offers/:id" element={<OfferPage />} />
            <Route
              path="orders/:id"
              element={
                <RequireAuth>
                  <OrderPage />
                </RequireAuth>
              }
            />
            <Route
              path="wallet"
              element={
                <RequireAuth>
                  <WalletPage />
                </RequireAuth>
              }
            />
            <Route
              path="login"
              element={
                <GuestOnly>
                  <LoginPage />
                </GuestOnly>
              }
            />
            <Route
              path="register"
              element={
                <GuestOnly>
                  <RegisterPage />
                </GuestOnly>
              }
            />
            <Route path="confirm" element={<ConfirmEmailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
