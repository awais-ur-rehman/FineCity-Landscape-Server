import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Otp from '../models/Otp.js';
import transporter from '../config/mail.js';
import env from '../config/env.js';
import ApiError from '../utils/apiError.js';
import { OTP_LENGTH, OTP_EXPIRY_MINUTES, OTP_MAX_ATTEMPTS } from '../utils/constants.js';
const generateOtp = () => {
    const min = Math.pow(10, OTP_LENGTH - 1);
    const max = Math.pow(10, OTP_LENGTH) - 1;
    return crypto.randomInt(min, max + 1).toString();
};
const buildOtpEmail = (otp) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F5F7F5;font-family:'Poppins',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F7F5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
          <!-- Green Header -->
          <tr>
            <td style="background-color:#2E7D32;padding:32px;text-align:center;">
              <h1 style="color:#FFFFFF;margin:0;font-size:24px;font-weight:600;">
                Finecity Landscape
              </h1>
              <p style="color:#81C784;margin:8px 0 0;font-size:14px;">
                Plant Care Management
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 32px;">
              <p style="color:#1B1B1B;font-size:16px;margin:0 0 8px;">Your verification code is:</p>
              <div style="background-color:#F5F7F5;border-radius:8px;padding:24px;text-align:center;margin:24px 0;">
                <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#2E7D32;">${otp}</span>
              </div>
              <p style="color:#6B6B6B;font-size:14px;margin:0;">
                This code expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>. Do not share it with anyone.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#F5F7F5;padding:20px 32px;text-align:center;">
              <p style="color:#6B6B6B;font-size:12px;margin:0;">
                &copy; ${new Date().getFullYear()} Finecity Landscape. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
export const sendOtp = async (email) => {
    await Otp.deleteMany({ email });
    const plainOtp = generateOtp();
    const hashedOtp = await bcrypt.hash(plainOtp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await Otp.create({
        email,
        otp: hashedOtp,
        attempts: 0,
        expiresAt,
    });
    await transporter.sendMail({
        from: env.SMTP_FROM,
        to: email,
        subject: 'Your Finecity Landscape Verification Code',
        html: buildOtpEmail(plainOtp),
    });
};
export const verifyOtp = async (email, plainOtp) => {
    const otpRecord = await Otp.findOne({ email }).sort({ createdAt: -1 });
    if (!otpRecord) {
        throw ApiError.badRequest('No OTP found for this email. Please request a new one.');
    }
    if (otpRecord.expiresAt < new Date()) {
        await Otp.deleteMany({ email });
        throw ApiError.badRequest('OTP has expired. Please request a new one.');
    }
    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
        await Otp.deleteMany({ email });
        throw ApiError.badRequest('Maximum OTP attempts exceeded. Please request a new one.');
    }
    const isMatch = await bcrypt.compare(plainOtp, otpRecord.otp);
    if (!isMatch) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        const remaining = OTP_MAX_ATTEMPTS - otpRecord.attempts;
        throw ApiError.badRequest(`Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
    }
    await Otp.deleteMany({ email });
    return true;
};
