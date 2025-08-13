import mongoose from "mongoose";
import { ChatEventEnum } from "../constants.js";
import { Chat } from "../models/chat.models.js";
import { ChatMessage } from "../models/message.models.js";
import { emitSocketEvent } from "../socket/index.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { r2Client } from "../config/R2Bucket.js";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import {
  getLocalPath,
  getStaticFilePath,
  removeLocalFile,
} from "../utils/helper.js";
import dotenv from "dotenv";
dotenv.config();

const chatMessageCommonAggregations = () => {
  return [
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "sender",
        as: "sender",
        pipeline: [
          {
            $project: {
              username: 1,
              name: 1,
              avatar: 1,
              email: 1,
              contact: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        sender: { $first: "$sender" },
      },
    },
  ];
};

const getAllMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const selectedChat = await Chat.findById(chatId);
  if (!selectedChat) {
    throw new ApiError(404, "chat not found");
  }
  if (!selectedChat.participants?.includes(req.user?._id)) {
    throw new ApiError(400, "User is not a part of this chat.");
  }
  const message = await ChatMessage.aggregate([
    {
      $match: {
        chat: new mongoose.Types.ObjectId(chatId),
      },
    },
    ...chatMessageCommonAggregations(),
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, message || [], "Message fetched successfully"));
});

const sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;

  const uploadedAttachments = Array.isArray(req.files?.attachments)
    ? req.files.attachments
    : req.files?.attachments
      ? [req.files.attachments]
      : [];

  if (!content && uploadedAttachments.length === 0) {
    throw new ApiError(400, "Message or attachments is required.");
  }

  const selectedChat = await Chat.findById(chatId);
  if (!selectedChat) {
    throw new ApiError(404, "Chat doesn't exist.");
  }

  const messageFiles = [];

  if (uploadedAttachments.length > 0) {
    console.log(`🔁 Uploading ${uploadedAttachments.length} file(s) to R2`);

    for (const attachment of uploadedAttachments) {
      try {
        const fileExtension = path.extname(attachment.originalname);
        const uniqueFileName = `${uuidv4()}${fileExtension}`;
        const r2Key = `chat-attachments/${chatId}/${uniqueFileName}`;

        const fileBuffer = attachment.buffer;
        const mimeType = attachment.mimetype || "application/octet-stream";

        // Detect type from mimetype
        let type = "file";
        if (mimeType.startsWith("image/")) type = "image";
        else if (mimeType.startsWith("video/")) type = "video";
        else if (
          mimeType === "application/pdf" ||
          mimeType.includes("msword") ||
          mimeType.includes("officedocument")
        )
          type = "document";
        else if (mimeType.includes("audio")) type = "audio";
        else type = "others";

        const uploadCommand = new PutObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: r2Key,
          Body: fileBuffer,
          ContentType: mimeType,
          ContentDisposition: `inline; filename="${attachment.originalname}"`,
          Metadata: {
            originalName: attachment.originalname,
            uploadedBy: req.user._id.toString(),
            chatId: chatId,
          },
        });

        await r2Client.send(uploadCommand);

        messageFiles.push({
          url: `https://${process.env.CLOUDFLARE_R2_BUCKET_DOMAIN}/${r2Key}`,
          r2Key,
          originalName: attachment.originalname,
          mimeType,
          size: attachment.size,
          type,
        });
      } catch (err) {
        console.error(`❌ Error uploading file:`, err);

        throw new ApiError(
          500,
          `Failed to upload ${attachment.originalname}. Error: ${err.message}`,
        );
      } finally {
        if (attachment.path && fs.existsSync(attachment.path)) {
          fs.unlinkSync(attachment.path); // Ensure file is deleted
        }
      }
    }
  }

  const message = await ChatMessage.create({
    sender: new mongoose.Types.ObjectId(req.user._id),
    content: content || "",
    chat: new mongoose.Types.ObjectId(chatId),
    attachments: messageFiles,
  });

  const chat = await Chat.findByIdAndUpdate(
    chatId,
    { $set: { lastMessage: message._id } },
    { new: true },
  );

  const messages = await ChatMessage.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(message._id) } },
    ...chatMessageCommonAggregations(),
  ]);

  const receivedMessage = messages[0];
  if (!receivedMessage) {
    throw new ApiError(500, "Message aggregation failed.");
  }

  chat.participants.forEach((participantId) => {
    if (participantId.toString() === req.user._id.toString()) return;
    emitSocketEvent(
      req,
      participantId.toString(),
      ChatEventEnum.MESSAGE_RECEIVED_EVENT,
      receivedMessage,
    );
  });

  return res
    .status(201)
    .json(new ApiResponse(201, receivedMessage, "Message sent successfully"));
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;

  const chat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    participants: req.user?._id,
  });

  if (!chat) {
    throw new ApiError(404, "chat doesn't exist");
  }

  const message = await ChatMessage.findOne({
    _id: new mongoose.Types.ObjectId(messageId),
  });

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorised to delete the message, you are not the sender.",
    );
  }

  if (Array.isArray(message.attachments) && message.attachments.length > 0) {
    for (const asset of message.attachments) {
      try {
        if (asset.r2Key) {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
            Key: asset.r2Key,
          });
          await r2Client.send(deleteCommand);
        } else {
          console.warn("Skipping R2 deletion — missing r2Key:", asset);
        }

        if (asset.localPath) {
          removeLocalFile(asset.localPath);
        }
      } catch (error) {
        console.error("❌ Error deleting attachment:", asset, error);
      }
    }
  }

  await ChatMessage.deleteOne({
    _id: new mongoose.Types.ObjectId(messageId),
  });

  if (chat.lastMessage.toString() === message._id.toString()) {
    const lastMessage = await ChatMessage.findOne(
      { chat: chatId },
      {},
      { sort: { createdAt: -1 } },
    );
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: lastMessage ? lastMessage?._id : null,
    });
  }

  chat.participants.forEach((participantObjectId) => {
    if (participantObjectId.toString() === req.user._id.toString()) return;

    emitSocketEvent(
      req,
      participantObjectId.toString(),
      ChatEventEnum.MESSAGE_DELETE_EVENT,
      message,
    );
  });
  return res
    .status(200)
    .json(new ApiResponse(200, message, "Message deleted successfully."));
});

export { getAllMessages, sendMessage, deleteMessage };
