// utils/otp.js
import { sendEmail } from "./mail.js";
import {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
} from "./mail.js";
import { ApiError } from "./ApiError.js";
import { sendOTPToPhone } from "./sms.js";

export const sendEmailOTP = async (user) => {
  const now = Date.now();
  const windowStart = now - 24 * 60 * 60 * 1000; // last 24 hrs
  user.otpRequests = user.otpRequests?.filter((ts) => ts > windowStart) || [];
  if (user.otpRequests.length >= 5) {
    throw new ApiError(429, "Maximum 5 OTP requests allowed in 24 hours");
  }
  const otp = user.generateEmailOTP();
  user.otpRequests.push(now);
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user.email,
    subject: "Verify your email - OTP",
    mailgenContent: emailVerificationMailgenContent(user.username, otp),
  });
  return otp;
};

export const sendPhoneOTP = async (user) => {
  const now = Date.now();
  const windowStart = now - 24 * 60 * 60 * 1000; // last 24 hrs
  user.otpRequests = user.otpRequests?.filter((ts) => ts > windowStart) || [];
  if (user.otpRequests.length >= 5) {
    throw new ApiError(429, "Maximum 5 OTP requests allowed in 24 hours");
  }
  const otp = user.generatePhoneOTP();
  user.otpRequests.push(now);
  await user.save({ validateBeforeSave: false });

  await sendOTPToPhone({
    to: user.contact,
    otp: otp,
  });
  return otp;
};

export const sendPasswordResetOTP = async (user) => {
  const otp = user.generatePasswordResetOTP();
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user.email,
    subject: "Your password reset OTP",
    mailgenContent: forgotPasswordMailgenContent(user.username, otp),
  });
  return otp;
};
