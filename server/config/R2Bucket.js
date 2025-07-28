import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

const r2Client = new S3Client({
  region: "auto",
  // Fix: Correct endpoint format for Cloudflare R2
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

console.log("✅ R2Bucket configured");
console.log("🪣 R2 config:");
console.log("Bucket:", process.env.CLOUDFLARE_R2_BUCKET_NAME);
console.log(
  "Endpoint:",
  `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
);

export { r2Client };
