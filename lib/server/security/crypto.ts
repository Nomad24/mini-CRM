import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const SECRET = process.env.CREDENTIALS_SECRET || process.env.JWT_SECRET || "dev-credentials-secret";

function getKey() {
  return createHash("sha256").update(SECRET).digest();
}

export function encryptText(plainText: string): string {
  const iv = randomBytes(12);
  const key = getKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptText(cipherText: string): string {
  const [ivRaw, tagRaw, encryptedRaw] = cipherText.split(":");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("Invalid encrypted payload");

  const iv = Buffer.from(ivRaw, "base64");
  const tag = Buffer.from(tagRaw, "base64");
  const encrypted = Buffer.from(encryptedRaw, "base64");
  const key = getKey();

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain.toString("utf8");
}

export function maskSecret(secret: string | null | undefined): string {
  if (!secret) return "";
  const visible = secret.slice(-4);
  return `••••••••${visible}`;
}
