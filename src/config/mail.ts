import nodemailer from 'nodemailer';
import env from './env.js';

/**
 * Nodemailer Gmail SMTP transporter.
 * @type {import('nodemailer').Transporter}
 */
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

/**
 * Verify SMTP connection on startup (non-blocking).
 */
transporter.verify()
  .then(() => console.log('SMTP transporter ready'))
  .catch((err) => console.warn('SMTP verification failed (emails may not work):', err.message));

export default transporter;
