export type GiftCardDeliveryEmail = {
  eventKey: string;
  recipient: string;
  publicOrderId: string;
  cards: Array<{
    denominationMinor: number;
    currency: string;
    code: string;
  }>;
};

export type PsAccountReadyEmail = {
  eventKey: string;
  recipient: string;
  publicOrderId: string;
  /** Human-readable region labels delivered in this order. */
  regions: string[];
};

export type TopUpConfirmationEmail = {
  eventKey: string;
  recipient: string;
  publicOrderId: string;
  kind: "steam" | "telegram";
  /** Steam login or Telegram @username the balance is credited to. */
  target: string;
  /** "500 RUB" for Steam, "1000 ⭐" for Telegram Stars. */
  amountLabel: string;
};

export interface EmailProvider {
  sendGiftCardDelivery(input: GiftCardDeliveryEmail): Promise<{
    providerMessageId: string;
  }>;
  /**
   * Notify that a ready-made PlayStation account is available. Carries NO
   * credentials — those live in the customer's account (ЛК), behind auth.
   */
  sendPsAccountReady(input: PsAccountReadyEmail): Promise<{
    providerMessageId: string;
  }>;
  /**
   * Confirm a wallet top-up (Steam balance / Telegram Stars). No code is
   * delivered — the balance is credited straight to the target account.
   */
  sendTopUpConfirmation(input: TopUpConfirmationEmail): Promise<{
    providerMessageId: string;
  }>;
}
