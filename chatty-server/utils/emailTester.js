// utils/emailTester.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

console.log(`hello .env is working`);

const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_SMTP_HOST,
  port: process.env.MAILTRAP_SMTP_PORT,
  auth: {
    user: process.env.MAILTRAP_SMTP_USER,
    pass: process.env.MAILTRAP_SMTP_PASS,
  },
});

const testSendEmail = async () => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_SENDER_EMAIL}>`,
      to: "avirejanshu@gmail.com", // Replace with your real email
      subject: "Test OTP Email",
      html: `
        <h2>Hello Avi!</h2>
        <p>Your OTP is: <b>123456</b></p>
        <p>This is just a test email from your Node.js app.</p>
      `,
    });

    console.log("✅ Email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Failed to send email:", err);
  }
};

testSendEmail();
//
//

// Import the Nodemailer library
// import nodemailer from "nodemailer";

// Create a transporter object
// const transporter = nodemailer.createTransport({
//   host: "live.smtp.mailtrap.io",
//   port: 587,
//   secure: false, // use SSL
//   auth: {
//     user: "api",
//     pass: "9a190bd448fe3c662cd06ba7e792a814",
//   },
// });
//
// // Configure the mailoptions object
// const mailOptions = {
//   from: "noreply@hawkjack.xyz",
//   to: "aviraj1729@gmail.com",
//   subject: "Sending Email using Node.js",
//   text: "That was easy!",
// };
//
// // Send the email
// transporter.sendMail(mailOptions, function (error, info) {
//   if (error) {
//     console.log("Error:", error);
//   } else {
//     console.log("Email sent:", info.response);
//   }
// });
