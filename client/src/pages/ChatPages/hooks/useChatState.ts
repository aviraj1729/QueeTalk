import { useState, useRef } from "react";
import type {
  ChatMessageInterface,
  ChatListItemInterface,
} from "../../interfaces/chat";

export function useChatState() {
  const currentChat = useRef<ChatListItemInterface | null>(null);
  const [chats, setChats] = useState<ChatListItemInterface[]>([]);
  const [messages, setMessages] = useState<ChatMessageInterface[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<ChatMessageInterface[]>(
    [],
  );
  const [isTyping, setIsTyping] = useState(false);
  const [message, setMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  return {
    currentChat,
    chats,
    setChats,
    messages,
    setMessages,
    unreadMessages,
    setUnreadMessages,
    isTyping,
    setIsTyping,
    message,
    setMessage,
    attachedFiles,
    setAttachedFiles,
  };
}
