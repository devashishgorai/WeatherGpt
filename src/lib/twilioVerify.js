import twilio from 'twilio';

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
  return getTwilioClient().verify.v2.services(getServiceSid()).verifications.create({
    to: phone,
    channel: 'sms',
  });
}

export async function checkVerificationCode(phone, code) {
  return getTwilioClient().verify.v2.services(getServiceSid()).verificationChecks.create({
    to: phone,
    code,
  });
}