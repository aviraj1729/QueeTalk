import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Sends an OTP to a given phone number using Twilio.
 *
 * @param {{ to: string, otp: string }} param0
 * @returns Promise<any>
 */
export const sendOTPToPhone = async ({ to, otp }) => {
  let formattedTo = to;

  // Ensure phone number starts with +91 (for India)
  if (!formattedTo.startsWith("+91")) {
    formattedTo = `+91${formattedTo}`;
  }

  return await client.messages.create({
    body: `Your Hawkjack OTP is ${otp}. It expires in 5 minutes.`,
    from: process.env.TWILIO_PHONE,
    to: formattedTo,
  });
};
