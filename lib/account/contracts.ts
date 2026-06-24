import type { AccountOverview } from "@/lib/account/queries";

export type AccountApiSuccess = {
  ok: true;
  account: AccountOverview;
};

export type AccountApiError = {
  ok: false;
  error: "unauthorized" | "not_found" | "invalid_request";
};

export type AccountApiResponse = AccountApiSuccess | AccountApiError;

export type UpdateProfileRequest = {
  displayName?: string | null;
  phone?: string | null;
  locale?: string;
  marketingConsent?: boolean;
};

