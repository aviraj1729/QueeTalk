import { requestHandler } from "../../utils";
import {
  getUserChats,
  getChatMessages,
  sendMessage,
  deleteMessage,
} from "../../api";

export function useChatApi() {
  const fetchChats = async (setChats: Function, setLoading: Function) => {
    await requestHandler(
      getUserChats,
      setLoading,
      (res) => setChats(res.data || []),
      alert,
    );
  };

  const fetchMessages = async (
    chatId: string,
    setMessages: Function,
    setLoading: Function,
  ) => {
    await requestHandler(
      () => getChatMessages(chatId),
      setLoading,
      (res) => setMessages(res.data || []),
      alert,
    );
  };

  const sendChatMessage = async (
    chatId: string,
    msg: string,
    files: File[],
    onSuccess: Function,
  ) => {
    await requestHandler(
      () => sendMessage(chatId, msg, files),
      null,
      (res) => onSuccess(res.data),
      alert,
    );
  };

  const deleteChatMessage = async (
    chatId: string,
    messageId: string,
    onSuccess: Function,
  ) => {
    await requestHandler(
      () => deleteMessage(chatId, messageId),
      null,
      (res) => onSuccess(res.data),
      alert,
    );
  };

  return { fetchChats, fetchMessages, sendChatMessage, deleteChatMessage };
}
