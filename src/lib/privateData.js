import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

function getKey() {
  const encodedKey = process.env.AUTH_DATA_ENCRYPTION_KEY;
  if (!encodedKey) throw new Error('AUTH_DATA_ENCRYPTION_KEY is not configured.');
  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== 32) throw new Error('AUTH_DATA_ENCRYPTION_KEY must be a 32-byte base64 key.');
  return key;
}

export function encryptPrivateData(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptPrivateData(value) {
  const [ivValue, tagValue, encryptedValue] = value.split('.');
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function blindIndex(value) {
  const secret = process.env.AUTH_DATA_ENCRYPTION_KEY;
  if (!secret) throw new Error('AUTH_DATA_ENCRYPTION_KEY is not configured.');
  return createHmac('sha256', secret).update(value).digest('hex');
}