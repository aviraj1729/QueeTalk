import { useEffect } from "react";
import { useSocket } from "../../contexts/SocketContext";
import type {
  ChatMessageInterface,
  ChatListItemInterface,
} from "../../interfaces/chat";

export function useChatSocket({
  onMessageReceived,
  onMessageDelete,
  onTyping,
  onStopTyping,
  onNewChat,
  onChatLeave,
  onGroupNameChange,
}: {
  onMessageReceived: (msg: ChatMessageInterface) => void;
  onMessageDelete: (msg: ChatMessageInterface) => void;
  onTyping: (chatId: string) => void;
  onStopTyping: (chatId: string) => void;
  onNewChat: (chat: ChatListItemInterface) => void;
  onChatLeave: (chat: ChatListItemInterface) => void;
  onGroupNameChange: (chat: ChatListItemInterface) => void;
}) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on("messageReceived", onMessageReceived);
    socket.on("messageDeleted", onMessageDelete);
    socket.on("typing", onTyping);
    socket.on("stopTyping", onStopTyping);
    socket.on("newChat", onNewChat);
    socket.on("leaveChat", onChatLeave);
    socket.on("updateGroupName", onGroupNameChange);

    return () => {
      socket.off("messageReceived", onMessageReceived);
      socket.off("messageDeleted", onMessageDelete);
      socket.off("typing", onTyping);
      socket.off("stopTyping", onStopTyping);
      socket.off("newChat", onNewChat);
      socket.off("leaveChat", onChatLeave);
      socket.off("updateGroupName", onGroupNameChange);
    };
  }, [
    socket,
    onMessageReceived,
    onMessageDelete,
    onTyping,
    onStopTyping,
    onNewChat,
    onChatLeave,
    onGroupNameChange,
  ]);
}
