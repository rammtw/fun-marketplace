/**
 * Имена для типов из сгенерированной спеки: `schema.d.ts` переписывается
 * командой `npm run api:sync`, поэтому руками правится только этот файл.
 */
import type { components } from './schema';

type Schemas = components['schemas'];

export type Money = Schemas['Money'];
export type UserView = Schemas['UserView'];
export type UserStatus = Schemas['UserStatus'];
export type GameSummary = Schemas['GameSummary'];
export type GameDetails = Schemas['GameDetails'];
export type SectionView = Schemas['SectionView'];
export type SectionKind = Schemas['SectionKind'];
export type OfferSummary = Schemas['OfferSummary'];
export type OfferDetails = Schemas['OfferDetails'];
export type SellerOfferView = Schemas['SellerOfferView'];
export type OfferStatus = Schemas['OfferStatus'];
export type CreateOfferRequest = Schemas['CreateOfferRequest'];
export type UpdateOfferRequest = Schemas['UpdateOfferRequest'];
export type OrderView = Schemas['OrderView'];
export type OrderSummary = Schemas['OrderSummary'];
export type OrderStatus = Schemas['OrderStatus'];
export type WalletView = Schemas['WalletView'];
export type DepositView = Schemas['DepositView'];
export type DepositStatus = Schemas['DepositStatus'];
export type PayoutView = Schemas['PayoutView'];
export type PayoutStatus = Schemas['PayoutStatus'];
export type DeliveryType = Schemas['DeliveryType'];
export type RegistrationRequest = Schemas['RegistrationRequest'];
export type PolicyView = Schemas['PolicyView'];
export type RulesView = Schemas['RulesView'];
export type AdmissionView = Schemas['AdmissionView'];
export type ExamView = Schemas['ExamView'];
export type ExamQuestionView = Schemas['ExamQuestionView'];
export type ExamResultView = Schemas['ExamResultView'];
