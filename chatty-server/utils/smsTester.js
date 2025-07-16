// utils/smsTester.js
import dotenv from "dotenv";
import twilio from "twilio";
dotenv.config();

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

const testSendSMS = async () => {
  try {
    const message = await client.messages.create({
      body: "Test SMS from Hawkjack: Your OTP is 654321",
      from: process.env.TWILIO_PHONE,
      to: "+917050188600", // Must be E.164 format
    });

    console.log("✅ SMS sent:", message.sid);
  } catch (err) {
    console.error("❌ Failed to send SMS:", err.message);
  }
};

testSendSMS();
