import { createHash, randomInt } from 'crypto';

const OTP_TTL_MS = 5 * 60 * 1000;
const otpStore = globalThis.__weathergptOtpStore || new Map();
globalThis.__weathergptOtpStore = otpStore;

function hashOtp(phone, otp) {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.MONGODB_URI || 'development-only';
  return createHash('sha256').update(`${phone}:${otp}:${secret}`).digest('hex');
}

export function issueOtp(phone) {
  const otp = String(randomInt(100000, 1000000));
  otpStore.set(phone, { hash: hashOtp(phone, otp), expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  return otp;
}

export function verifyOtp(phone, otp) {
  const record = otpStore.get(phone);
  if (!record || record.expiresAt < Date.now() || record.attempts >= 5) return false;
  record.attempts += 1;
  const valid = record.hash === hashOtp(phone, otp);
  if (valid) otpStore.delete(phone);
  return valid;
}