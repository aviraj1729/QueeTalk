// Import necessary modules and utilities
import type { APIInterface } from "../interfaces/APIInterface";
import { requestHandler } from "../utils";
import axios from "axios";
import { LocalStorage } from "../utils";

// create an axios instance for API requests
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  withCredentials: true,
  timeout: 120000,
});

// Add interceptor to set authorization header with user token before requests
apiClient.interceptors.request.use(
  function (config) {
    //Retrive user token from local storage
    const token = LocalStorage.get("token");
    // set authorization header with bearer token
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  function (error) {
    return Promise.reject(error);
  },
);

//API functions for diffirent requests
const loginUser = (data: {
  username?: string;
  email?: string;
  password: string;
}) => {
  return apiClient.post("/auth/login", data);
};

const registerUser = (data: {
  email: string;
  password: string;
  username: string;
  contact: string;
  full_name: string;
  date_of_birth: string;
}) => {
  return apiClient.post("/auth/register", data);
};

const changeUserPassword = (data: {
  email: string;
  old_password: string;
  new_password: string;
}) => {
  return apiClient.post("/auth/change-password", data);
};

const forgotUserPassword = (data: { email: string; password: string }) => {
  return apiClient.post("/auth/forgot-password", data);
};

const sendOTP = (data: { type: "email" | "phone"; value: string }) => {
  return requestHandler<APIInterface<{ otpId: string }>>(
    apiClient.post("/otp/send", data),
  );
};

const verifyOTP = (data: { otpId: string; otp: string }) => {
  return requestHandler<APIInterface<{ verified: boolean }>>(
    apiClient.post("/otp/verify", data),
  );
};

const logoutUser = () => apiClient.post("/auth/logout");

const currentUser = () => apiClient.get("/auth/current-user");

const getAvailableUsers = () => apiClient.get("/chatty/chats/users");
const getUserChats = () => apiClient.get("/chatty/chats");
const createUserChat = (receiverId: string) =>
  apiClient.post(`/chatty/chats/c/${receiverId}`);
const createGroupChat = (data: { name: string; participants: string[] }) =>
  apiClient.post(`/chatty/chats/group`, data);
const getGroupInfo = (chatId: string) =>
  apiClient.get(`/chatty/chats/group/${chatId}`);
const updateGroupName = (chatId: string, name: string) =>
  apiClient.patch(`chatty/chats/group/${chatId}`, name);
const deleteGroup = (chatId: string) =>
  apiClient.delete(`chatty/chats/group/${chatId}`);
const deleteOneOnOneChat = (chatId: string) =>
  apiClient.delete(`chatty/chats/remove/${chatId}`);
const addParticipantToGroup = (chatId: string, participantId: string) =>
  apiClient.post(`/chatty/chats/group/${chatId}/${participantId}`);
const removeParticipantFromGroup = (chatId: string, participantId: string) =>
  apiClient.delete(`/chatty/chats/group/${chatId}/${participantId}`);

const getMessages = (chatId: string) =>
  apiClient.get(`chatty/messages/${chatId}`);
const sendMessage = (chatId: string, content: string, attachments: File[]) => {
  const formData = new FormData();
  if (content) {
    formData.append("content", content);
  }
  attachments?.map((file) => {
    formData.append(("attachments", file));
  });
  return apiClient.post(`/chatty/messages/${chatId}`, formData);
};

const getChatMessages = (chatId: string) => {
  return apiClient.get(`/chatty/messages/${chatId}`);
};

const deleteMessage = (chatId: string, messageId: string) => {
  return apiClient.delete(`/chatty/messages/${chatId}/${messageId}`);
};

export {
  registerUser,
  loginUser,
  changeUserPassword,
  logoutUser,
  sendOTP,
  verifyOTP,
  forgotUserPassword,
  currentUser,
  getAvailableUsers,
  getUserChats,
  getChatMessages,
  createUserChat,
  createGroupChat,
  deleteMessage,
  getGroupInfo,
  updateGroupName,
  deleteGroup,
  deleteOneOnOneChat,
  addParticipantToGroup,
  removeParticipantFromGroup,
  getMessages,
  sendMessage,
};
