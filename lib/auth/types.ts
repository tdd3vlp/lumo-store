export type AuthenticatedCustomer = {
  customerId: string;
  provider: string;
  providerSubject: string;
};

export type ResolveAuthenticatedCustomer = (
  request: Request,
) => Promise<AuthenticatedCustomer | null>;

