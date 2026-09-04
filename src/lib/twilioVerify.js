import twilio from 'twilio';

const TWILIO_REQUEST_TIMEOUT_MS = 10000;

function withTimeout(request, operation) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Twilio ${operation} request timed out.`)), TWILIO_REQUEST_TIMEOUT_MS);
  });
  return Promise.race([request, timeout]).finally(() => clearTimeout(timeoutId));
}

function getTwilioClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials are not configured.');
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

function getServiceSid() {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!serviceSid) throw new Error('TWILIO_VERIFY_SERVICE_SID is not configured.');
  return serviceSid;
}

export async function sendVerificationCode(phone) {
  return withTimeout(getTwilioClient().verify.v2.services(getServiceSid()).verifications.create({
    to: phone,
    channel: 'sms',
  }), 'verification');
}

export async function checkVerificationCode(phone, code) {
  return withTimeout(getTwilioClient().verify.v2.services(getServiceSid()).verificationChecks.create({
    to: phone,
    code,
  }), 'verification check');
}