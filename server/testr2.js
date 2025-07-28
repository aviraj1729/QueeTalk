import { ListObjectsV2Command, HeadBucketCommand } from "@aws-sdk/client-s3";

export const testR2Connection = async () => {
  try {
    console.log("🧪 Testing R2 connection...");

    // Test 1: Check if bucket exists and is accessible
    const headBucketCommand = new HeadBucketCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    });

    await r2Client.send(headBucketCommand);
    console.log("✅ Bucket access test passed");

    // Test 2: Try to list objects (this tests read permissions)
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      MaxKeys: 1,
    });

    const result = await r2Client.send(listCommand);
    console.log("✅ List objects test passed");
    console.log(`📊 Bucket contains ${result.KeyCount || 0} objects`);

    return { success: true, message: "R2 connection successful" };
  } catch (error) {
    console.error("❌ R2 connection test failed:", error);

    if (error.name === "NoSuchBucket") {
      return { success: false, message: "Bucket does not exist" };
    } else if (error.name === "AccessDenied") {
      return {
        success: false,
        message: "Access denied - check your API token permissions",
      };
    } else if (error.name === "InvalidAccessKeyId") {
      return { success: false, message: "Invalid access key ID" };
    } else if (error.name === "SignatureDoesNotMatch") {
      return { success: false, message: "Invalid secret access key" };
    }

    return { success: false, message: error.message };
  }
};
