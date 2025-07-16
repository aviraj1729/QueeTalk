import mongoose, { Mongoose } from "mongoose";
import { ChatEventEnum } from "../constants.js";
import { User } from "../models/user.models.js";
import { Chat } from "../models/chat.models.js";
import { ChatMessage } from "../models/message.models.js";
import { emitSocketEvent } from "../socket/index.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { removeLocalFile } from "../utils/helper.js";

const chatCommonAggregations = (req) => {
  return [
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "participants",
        as: "participants",
        pipeline: [
          {
            $project: {
              password: 0,
              loginType: 0,
              isEmailVerified: 0,
              isContactVerified: 0,
              refreshToken: 0,
              emailOTP: 0,
              emailOTPExpiry: 0,
              phoneOTP: 0,
              phoneOTPExpiry: 0,
              passwordResetOTP: 0,
              passwordResetOTPExpiry: 0,
              lastLogin: 0,
              loginAttempts: 0,
              lockUntil: 0,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "chatmessages",
        let: { messageId: "$lastMessage" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$_id", "$$messageId"],
              },
            },
          },
          {
            $lookup: {
              from: "users",
              let: { senderId: "$sender" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$_id", "$$senderId"] },
                  },
                },
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                    email: 1,
                    contact: 1,
                  },
                },
              ],
              as: "sender",
            },
          },
          {
            $addFields: {
              sender: { $first: "$sender" },
            },
          },
        ],
        as: "lastMessage",
      },
    },
    {
      $addFields: {
        lastMessage: { $first: "$lastMessage" },
      },
    },
    {
      $lookup: {
        from: "chatmessages",
        let: { chatId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$chat", "$$chatId"] },
                  { $ne: ["$sender", req.user._id] }, // Don't count own messages
                  {
                    $not: {
                      $in: [req.user._id, "$readBy"],
                    },
                  },
                ],
              },
            },
          },
          {
            $count: "unreadCount",
          },
        ],
        as: "unreadMessages",
      },
    },
    {
      $addFields: {
        unreadMessageCount: {
          $ifNull: [{ $first: "$unreadMessages.unreadCount" }, 0],
        },
      },
    },
  ];
};

const deleteCascadeChatMessage = async (chatId) => {
  const messages = await ChatMessage.find({
    chat: new mongoose.Types.ObjectId(chatId),
  });
  let attachments = [];
  attachments = attachments.concat(
    ...messages.map((message) => {
      return message.attachments;
    }),
  );
  attachments.forEach((attachment) => {
    removeLocalFile(attachment.localPath);
  });

  await ChatMessage.deleteMany({
    chat: new mongoose.Types.ObjectId(chatId),
  });
};

const searchAvailableUsers = asyncHandler(async (req, res) => {
  const users = await User.aggregate([
    {
      $match: {
        _id: {
          $ne: req.user._id,
        },
      },
    },
    {
      $project: {
        avatar: 1,
        username: 1,
        email: 1,
        contact: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
});

const createOrGetAOneOnOneChat = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;

  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new ApiError(404, "Receiver doesn't exist");
  }

  if (receiver._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You cannot chat with yourself");
  }

  // Check if a one-on-one chat already exists
  const existingChat = await Chat.aggregate([
    {
      $match: {
        isGroupChat: false,
        $and: [
          { participants: { $elemMatch: { $eq: req.user._id } } },
          {
            participants: {
              $elemMatch: { $eq: new mongoose.Types.ObjectId(receiverId) },
            },
          },
        ],
      },
    },
    ...chatCommonAggregations(req),
  ]);

  if (existingChat.length) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, existingChat[0], "Chat retrieved successfully"),
      );
  }

  // Create new one-on-one chat
  const newChatInstance = await Chat.create({
    name: `chat:${req.user._id.toString()}:${receiverId.toString()}`,
    participants: [req.user._id, new mongoose.Types.ObjectId(receiverId)],
  });

  // Fetch the newly created chat with aggregation
  const createdChat = await Chat.aggregate([
    {
      $match: { _id: newChatInstance._id },
    },
    ...chatCommonAggregations(req),
  ]);

  const payload = createdChat[0];
  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }

  // Notify other user via socket event
  payload.participants.forEach((participant) => {
    if (participant._id.toString() === req.user._id.toString()) return;

    emitSocketEvent(
      req,
      participant._id.toString(),
      ChatEventEnum.NEW_CHAT_EVENT,
      payload,
    );
  });

  return res
    .status(201)
    .json(new ApiResponse(201, payload, "Chat created successfully"));
});

const createAGroupChat = asyncHandler(async (req, res) => {
  const { name, participants } = req.body;
  if (participants.includes(req.user._id.toString())) {
    throw new ApiError(
      400,
      "Participants array should not contain the group creator",
    );
  }
  const members = [...new Set([...participants, req.user._id.toString()])];
  if (members.length < 3) {
    throw new ApiError(
      400,
      "Seems like you have passed duplicate participants.",
    );
  }

  const groupChat = await Chat.create({
    name,
    isGroupChat: true,
    participants: members,
    admin: req.user._id,
  });

  const chat = await Chat.aggregate([
    {
      $match: {
        _id: groupChat._id,
      },
    },
    ...chatCommonAggregations(req),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal Server error");
  }

  payload?.participants?.forEach((participant) => {
    if (participant._id.toString() === req.user._id.toString()) return;

    emitSocketEvent(
      req,
      participant._id.toString(),
      ChatEventEnum.NEW_CHAT_EVENT,
      payload,
    );
  });
  return res
    .status(201)
    .json(new ApiResponse(201, payload, "Group chat created successfully"));
});

const getGroupChatDetails = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const groupChat = await Chat.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatId),
        isGroupChat: true,
      },
    },
    ...chatCommonAggregations(req),
  ]);
  const chat = groupChat[0];
  if (!chat) {
    throw new ApiError(404, "Group chat doesn't exist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, chat, "Group chat fetched successfully"));
});

const renameGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { name } = req.body;
  const groupChat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });

  if (!groupChat) {
    throw new ApiError(404, "Requested group doesn't exist");
  }
  if (groupChat.admin?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not an admin");
  }

  const updatedGroupChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: {
        name,
      },
    },
    { new: true },
  );

  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updatedGroupChat._id,
      },
    },
    ...chatCommonAggregations(req),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal Server Error");
  }

  payload?.participants?.forEach((participant) => {
    emitSocketEvent(
      req,
      participant._id?.toString(),
      ChatEventEnum.UPDATE_GROUP_NAME_EVENT,
      payload,
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Group name updated successfully"));
});

const deleteGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const groupChat = await Chat.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatId),
        isGroupChat: true,
      },
    },
    ...chatCommonAggregations(req),
  ]);

  const chat = groupChat[0];
  if (!chat) {
    throw new ApiError(404, "Group Chat does not exist");
  }

  if (chat.admin?.toString() !== req.user._id?.toString()) {
    throw new ApiError(403, "Only admin can delete the group");
  }

  await Chat.findByIdAndDelete(chatId);
  await deleteCascadeChatMessage(chatId);

  chat?.participants?.forEach((participant) => {
    emitSocketEvent(
      req,
      participant._id?.toString(),
      ChatEventEnum.LEAVE_CHAT_EVENT,
      chat,
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Group chat deleted successfully"));
});

const deleteOneOnOneChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const chat = await Chat.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatId),
      },
    },
    ...chatCommonAggregations(req),
  ]);
  const payload = chat[0];

  if (!payload) {
    throw new ApiError(404, "Chat doesn't exist");
  }

  await Chat.findByIdAndDelete(chatId);
  await deleteCascadeChatMessage(chatId);

  const otherParticipant = payload?.participants?.find(
    (participant) => participant?._id.toString() !== req.user._id.toString(),
  );

  if (otherParticipant) {
    emitSocketEvent(
      req,
      otherParticipant._id?.toString(),
      ChatEventEnum.LEAVE_CHAT_EVENT,
      payload,
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Chat deleted successfully"));
});

const leaveGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { newAdminId } = req.body;

  const groupChat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });

  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist.");
  }

  const userIdStr = req.user._id.toString();
  const participantIds = groupChat.participants.map((id) => id.toString());

  if (!participantIds.includes(userIdStr)) {
    throw new ApiError(400, "You are not a member of this group chat.");
  }

  const updateQuery = {
    $pull: { participants: req.user._id },
  };

  if (groupChat.admin.toString() === userIdStr) {
    // Admin is leaving — must assign new admin
    if (!newAdminId) {
      throw new ApiError(400, "New admin ID is required if admin leaves.");
    }

    if (!participantIds.includes(newAdminId)) {
      throw new ApiError(
        400,
        "New admin must be an existing group participant.",
      );
    }

    if (newAdminId === userIdStr) {
      throw new ApiError(
        400,
        "You cannot assign yourself as admin after leaving.",
      );
    }

    updateQuery.$set = {
      admin: new mongoose.Types.ObjectId(newAdminId),
    };
  }

  const updatedChat = await Chat.findByIdAndUpdate(chatId, updateQuery, {
    new: true,
  });

  const chatResult = await Chat.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...chatCommonAggregations(req),
  ]);

  const payload = chatResult[0];

  if (!payload) {
    throw new ApiError(500, "Internal Server Error");
  }

  // Notify remaining participants
  payload?.participants?.forEach((participant) => {
    emitSocketEvent(
      req,
      participant._id?.toString(),
      ChatEventEnum.LEAVE_CHAT_EVENT,
      payload,
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Left the group chat successfully"));
});

const addNewParticipantInGroupChat = asyncHandler(async (req, res) => {
  const { chatId, participantId } = req.params;
  const groupChat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });

  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist.");
  }

  if (groupChat.admin?.toString() !== req.user._id?.toString()) {
    throw new ApiError(403, "You are not an admin.");
  }

  const existingParticipants = groupChat.participants.map((id) =>
    id.toString(),
  );

  if (existingParticipants.includes(participantId)) {
    throw new ApiError(409, "Participant already in the group chat");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: {
        participants: new mongoose.Types.ObjectId(participantId),
      },
    },
    { new: true },
  );

  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...chatCommonAggregations(req),
  ]);

  const payload = chat[0];
  if (!payload) {
    throw new ApiError(500, "Internal Server Error");
  }

  // Notify new participant
  emitSocketEvent(req, participantId, ChatEventEnum.NEW_CHAT_EVENT, payload);

  // Notify existing participants
  payload?.participants?.forEach((participant) => {
    if (
      participant._id.toString() === participantId ||
      participant._id.toString() === req.user._id.toString()
    )
      return;

    emitSocketEvent(
      req,
      participant._id.toString(),
      ChatEventEnum.NEW_CHAT_EVENT,
      payload,
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Participant added successfully"));
});

const removeParticipantFromGroupChat = asyncHandler(async (req, res) => {
  const { chatId, participantId } = req.params;

  const groupChat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });

  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  if (groupChat.admin?.toString() !== req.user._id?.toString()) {
    throw new ApiError(403, "You are not an admin");
  }

  const existingParticipants = groupChat.participants.map((id) =>
    id.toString(),
  );

  if (!existingParticipants.includes(participantId)) {
    throw new ApiError(400, "Participant does not exist in the group chat.");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: {
        participants: new mongoose.Types.ObjectId(participantId),
      },
    },
    { new: true },
  );

  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...chatCommonAggregations(req),
  ]);

  const payload = chat[0];
  if (!payload) {
    throw new ApiError(500, "Internal Server error");
  }

  // Notify removed participant
  emitSocketEvent(req, participantId, ChatEventEnum.LEAVE_CHAT_EVENT, payload);

  // Notify remaining participants
  payload?.participants?.forEach((participant) => {
    if (participant._id.toString() === req.user._id.toString()) return;

    emitSocketEvent(
      req,
      participant._id.toString(),
      ChatEventEnum.LEAVE_CHAT_EVENT,
      payload,
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "User removed successfully"));
});

const getAllChats = asyncHandler(async (req, res) => {
  const chats = await Chat.aggregate([
    {
      $match: {
        participants: { $elemMatch: { $eq: req.user._id } },
      },
    },
    {
      $sort: {
        updatedAt: -1,
      },
    },
    ...chatCommonAggregations(req),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, chats || [], "User chats fetched successfully!"),
    );
});

export {
  addNewParticipantInGroupChat,
  createAGroupChat,
  createOrGetAOneOnOneChat,
  deleteGroupChat,
  deleteOneOnOneChat,
  getAllChats,
  getGroupChatDetails,
  leaveGroupChat,
  removeParticipantFromGroupChat,
  renameGroupChat,
  searchAvailableUsers,
};
