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

export interface EmailProvider {
  sendGiftCardDelivery(input: GiftCardDeliveryEmail): Promise<{
    providerMessageId: string;
  }>;
}
