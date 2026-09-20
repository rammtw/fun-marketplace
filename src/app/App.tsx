import { BrowserRouter, Route, Routes } from 'react-router';
import { WalletProvider } from 'entities/wallet';
import { SessionProvider } from 'shared/auth';
import { GamesPage } from 'pages/games';
import { GamePage } from 'pages/game';
import { LoginPage } from 'pages/login';
import { RegisterPage } from 'pages/register';
import { ConfirmEmailPage } from 'pages/confirm-email';
import { PrivacyPolicyPage } from 'pages/privacy-policy';
import { OfferPage } from 'pages/offer';
import { OrderPage } from 'pages/order';
import { OrdersPage } from 'pages/orders';
import { MyOffersPage } from 'pages/my-offers';
import { OfferEditorPage } from 'pages/offer-editor';
import { SellingPage } from 'pages/selling';
import { WalletPage } from 'pages/wallet';
import { NotFoundPage } from 'pages/not-found';
import { GuestOnly } from './ui/GuestOnly';
import { RequireAuth } from './ui/RequireAuth';
import { RequireSellingAdmission } from './ui/RequireSellingAdmission';
import { RootLayout } from './ui/RootLayout';
import './styles/global.css';

export function App() {
  return (
    <SessionProvider>
      <WalletProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<RootLayout />}>
              <Route index element={<GamesPage />} />
              <Route path="games/:slug" element={<GamePage />} />
              <Route path="offers/:id" element={<OfferPage />} />
              <Route
                path="orders"
                element={
                  <RequireAuth>
                    <OrdersPage />
                  </RequireAuth>
                }
              />
              <Route
                path="orders/:id"
                element={
                  <RequireAuth>
                    <OrderPage />
                  </RequireAuth>
                }
              />
              <Route
                path="my/offers"
                element={
                  <RequireAuth>
                    <MyOffersPage />
                  </RequireAuth>
                }
              />
              <Route path="privacy" element={<PrivacyPolicyPage />} />
              <Route path="selling" element={<SellingPage />} />
              <Route
                path="my/offers/new"
                element={
                  <RequireAuth>
                    <RequireSellingAdmission>
                      <OfferEditorPage />
                    </RequireSellingAdmission>
                  </RequireAuth>
                }
              />
              <Route
                path="my/offers/:id/edit"
                element={
                  <RequireAuth>
                    <OfferEditorPage />
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
      </WalletProvider>
    </SessionProvider>
  );
}
