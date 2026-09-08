import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmail(to, subject, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS are not configured.');
  }

  return transporter.sendMail({
    from: `"WeatherGPT" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

export async function sendWelcomeEmail({ to, name }) {
  return sendEmail(
    to,
    'Welcome to WeatherGPT',
    `<p>Hi ${name},</p><p>Your WeatherGPT account is ready.</p><p>Stay weather-aware,<br />WeatherGPT</p>`,
  );
}

export async function sendPasswordResetOtp({ to, otp }) {
  return sendEmail(
    to,
    'Your WeatherGPT password reset code',
    `<p>Your WeatherGPT verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${otp}</p><p>This code expires in 5 minutes. If you did not request a password reset, you can ignore this email.</p>`,
  );
}

export async function sendEmailVerificationOtp({ to, otp }) {
  return sendEmail(
    to,
    'Verify your WeatherGPT email address',
    `<p>Your WeatherGPT email verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${otp}</p><p>This code expires in 5 minutes.</p>`,
  );
}

export async function sendAdminEmail({ to, subject, text, html }) {
  return transporter.sendMail({
    from: `"WeatherGPT" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}