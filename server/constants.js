export const UserLoginType = {
  EMAIL_OTP: "EMAIL_OTP",
  EMAIL_PASSWORD: "EMAIL_PASSWORD",
};

export const USER_TEMPORARY_TOKEN_EXPIRY = 20 * 60 * 1000; // 20 minutes

export const MAXIMUM_SUB_IMAGE_COUNT = 4;
export const MAXIMUM_SOCIAL_POST_IMAGE_COUNT = 6;

export const ChatEventEnum = Object.freeze({
  CONNECTED_EVENT: "connected",
  DISCONNECT_EVENT: "disconnect",
  JOIN_CHAT_EVENT: "joinchat",
  LEAVE_CHAT_EVENT: "leavechat",
  UPDATE_GROUP_NAME: "updategroupname",
  MESSAGE_RECEIVED_EVENT: "messageReceived",
  NEW_CHAT_EVENT: "newchat",
  SOCKET_ERROR_EVENT: "socketerror",
  STOP_TYPING_EVENT: "stoptyping",
  TYPING_EVENT: "typingevent",
  MESSAGE_DELETE_EVENT: "messagedeleted",
});

export const AvailableChatEvent = Object.values(ChatEventEnum);
