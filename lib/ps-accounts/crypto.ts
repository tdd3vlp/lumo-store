import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Credentials held for a PlayStation account until it's delivered. Encrypted as
// one JSON blob with the project key (same AES-256-GCM scheme as gift-card codes).
export type PsAccountFields = {
  email: string;
  password: string;
  /** 2FA codes / backup codes / TOTP secret. */
  totp: string;
  /** Date of birth. */
  birthdate: string;
};

function encryptionKey() {
  const encoded = process.env.GIFT_CARD_ENCRYPTION_KEY;
  if (!encoded) throw new Error("GIFT_CARD_ENCRYPTION_KEY is missing");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("GIFT_CARD_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  return key;
}

export function encryptPsAccount(fields: PsAccountFields): {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
} {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(fields), "utf8"),
    cipher.final(),
  ]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

export function decryptPsAccount(input: {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}): PsAccountFields {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), input.iv);
  decipher.setAuthTag(input.authTag);
  const json = Buffer.concat([
    decipher.update(input.ciphertext),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(json) as PsAccountFields;
}
