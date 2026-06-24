import { sql } from "@/lib/db";

export async function updateCustomerProfile(
  customerId: string,
  input: {
    displayName?: string | null;
    phone?: string | null;
    locale?: string;
    marketingConsent?: boolean;
  },
) {
  const displayName =
    input.displayName === undefined
      ? undefined
      : input.displayName?.trim().slice(0, 120) || null;
  const phone =
    input.phone === undefined ? undefined : input.phone?.trim().slice(0, 40) || null;
  const locale = input.locale?.trim().slice(0, 10);
  const displayNameProvided = input.displayName !== undefined;
  const phoneProvided = input.phone !== undefined;
  const localeProvided = input.locale !== undefined;
  const marketingConsentProvided = input.marketingConsent !== undefined;

  const [profile] = await sql`
    INSERT INTO customer_profiles (
      customer_id,
      display_name,
      phone,
      locale,
      marketing_consent
    )
    VALUES (
      ${customerId},
      ${displayName || null},
      ${phone || null},
      ${locale ?? "ru"},
      ${input.marketingConsent ?? false}
    )
    ON CONFLICT (customer_id) DO UPDATE SET
      display_name = CASE
        WHEN ${displayNameProvided} THEN ${displayName || null}
        ELSE customer_profiles.display_name
      END,
      phone = CASE
        WHEN ${phoneProvided} THEN ${phone || null}
        ELSE customer_profiles.phone
      END,
      locale = CASE
        WHEN ${localeProvided} THEN ${locale ?? "ru"}
        ELSE customer_profiles.locale
      END,
      marketing_consent = CASE
        WHEN ${marketingConsentProvided} THEN ${input.marketingConsent ?? false}
        ELSE customer_profiles.marketing_consent
      END,
      updated_at = now()
    RETURNING
      customer_id,
      display_name,
      phone,
      locale,
      marketing_consent,
      updated_at
  `;

  return profile;
}
