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

export async function sendAdminEmail({ to, subject, text, html }) {
  return transporter.sendMail({
    from: `"WeatherGPT" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}