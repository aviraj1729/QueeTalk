import mongoose, { Schema } from "mongoose";

const chatAttachmentSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["image", "video", "audio", "document", "other"],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    r2Key: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
    },
    size: {
      type: Number,
    },
    mimeType: {
      type: String,
    },
    originalName: {
      type: String,
    },
    localPath: {
      type: String,
    },
  },
  { _id: false },
);

const chatMessageSchema = new Schema(
  {
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
    },
    attachments: [chatAttachmentSchema],
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    deliveredTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    deletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true },
);

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
