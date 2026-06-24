import { sql } from "@/lib/db";

export async function linkAuthIdentity(input: {
  provider: string;
  providerSubject: string;
  email: string;
  emailVerified: boolean;
}) {
  return sql.begin(async (transaction) => {
    const normalizedEmail = input.email.trim().toLowerCase();
    const [existingIdentity] = await transaction`
      SELECT customer_id
      FROM auth_identities
      WHERE provider = ${input.provider}
        AND provider_subject = ${input.providerSubject}
      FOR UPDATE
    `;

    if (existingIdentity) {
      await transaction`
        UPDATE auth_identities
        SET last_login_at = now()
        WHERE provider = ${input.provider}
          AND provider_subject = ${input.providerSubject}
      `;
      return existingIdentity.customer_id as string;
    }

    const [customer] = input.emailVerified
      ? await transaction`
          INSERT INTO customers (email, email_verified_at)
          VALUES (${normalizedEmail}, now())
          ON CONFLICT (email) DO UPDATE SET
            email_verified_at = COALESCE(customers.email_verified_at, now()),
            updated_at = now()
          RETURNING id
        `
      : await transaction`
          INSERT INTO customers (email, email_verified_at)
          VALUES (${normalizedEmail}, null)
          ON CONFLICT (email) DO NOTHING
          RETURNING id
        `;

    if (!customer) {
      throw new Error("Cannot link unverified OAuth email to an existing customer");
    }

    await transaction`
      INSERT INTO customer_profiles (customer_id)
      VALUES (${customer.id})
      ON CONFLICT (customer_id) DO NOTHING
    `;

    await transaction`
      INSERT INTO auth_identities (
        customer_id,
        provider,
        provider_subject,
        last_login_at
      )
      VALUES (
        ${customer.id},
        ${input.provider},
        ${input.providerSubject},
        now()
      )
    `;

    return customer.id as string;
  });
}
