import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

type EncryptedGiftCardCode = {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  fingerprint: string;
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

export function encryptGiftCardCode(code: string): EncryptedGiftCardCode {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(code.trim(), "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext,
    iv,
    authTag: cipher.getAuthTag(),
    fingerprint: createHmac("sha256", key)
      .update(code.trim())
      .digest("hex"),
  };
}

export function decryptGiftCardCode(input: {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), input.iv);
  decipher.setAuthTag(input.authTag);

  return Buffer.concat([
    decipher.update(input.ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

