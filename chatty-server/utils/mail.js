import nodemailer from "nodemailer";

import dotenv from "dotenv";
dotenv.config();

export const sendEmail = async ({ email, subject, mailgenContent }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST, // Mailtrap Send SMTP
    port: process.env.MAILTRAP_SMTP_PORT,
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  });

  const mailOptions = {
    from: '"Hawkjack OTP" <noreply@hawkjack.xyz>',
    to: email,
    subject,
    html: mailgenContent,
  };

  await transporter.sendMail(mailOptions);
};

// Example: Mailgen template
export const emailVerificationMailgenContent = (username, otp) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0;">
    <h2 style="color: #333;">Hello ${username},</h2>
    <p style="font-size: 16px; color: #555;">
      Your verification OTP code is:
    </p>
    <div style="font-size: 28px; font-weight: bold; background-color: #f0f0f0; padding: 15px; text-align: center; border-radius: 8px; color: #2b2b2b;">
      ${otp}
    </div>
    <p style="font-size: 14px; color: #777; margin-top: 20px;">
      This OTP is valid for 5 minutes. If you didn’t request this, you can safely ignore this email.
    </p>
    <p style="font-size: 14px; color: #aaa; text-align: center; margin-top: 40px;">
      — Hawkjack Team
    </p>
  </div>
`;

export const forgotPasswordMailgenContent = (username, otp) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0;">
    <h2 style="color: #333;">Hi ${username},</h2>
    <p style="font-size: 16px; color: #555;">
      We received a request to reset your password.
    </p>
    <p style="font-size: 16px; color: #555;">
      Use the following OTP to proceed:
    </p>
    <div style="font-size: 28px; font-weight: bold; background-color: #fdf6b2; padding: 15px; text-align: center; border-radius: 8px; color: #665c00;">
      ${otp}
    </div>
    <p style="font-size: 14px; color: #777; margin-top: 20px;">
      This code is valid for 5 minutes. If you didn’t request a password reset, you can ignore this message.
    </p>
    <p style="font-size: 14px; color: #aaa; text-align: center; margin-top: 40px;">
      — Hawkjack Security Team
    </p>
  </div>
`;
