import React, { useState } from "react";
import type {
  ChatListItemInterface,
  ChatMessageInterface,
} from "../types/chat";
import MessageBox from "./chat/MessageBox";
import MessageComponent from "./chat/MessageComponent";

interface ChatWindowProps {
  chat: ChatListItemInterface | null;
  messages: ChatMessageInterface[];
  currentUserId: string;
  onBack: () => void;
  onSendMessage: (text: string, attachments: File[]) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  messages,
  currentUserId,
  onBack,
  onSendMessage,
}) => {
  if (!chat) return null;

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const handleDropdownToggle = (messageId: string | null) => {
    setActiveDropdown(messageId);
  };

  const handleExitChat = () => {
    setActiveDropdown(null);
    onBack();
  };

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const getOtherParticipant = () => {
    if (chat.isGroupChat) return null;
    return chat.participants.find((p) => p._id !== currentUserId);
  };

  const otherParticipant = getOtherParticipant();

  return (
    <div className="flex flex-col h-full px-5 pb-5 relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-4 border-gray-800 shadow-sm">
        <button className="md:hidden" onClick={onBack}>
          ←
        </button>
        <div className="flex items-center gap-3">
          <div className="text-2xl">
            {chat.isGroupChat ? (
              chat?.lastMessage?.sender?.avatar?.url ? (
                <img
                  src={chat.lastMessage.sender.avatar.url}
                  alt="Group"
                  className="object-cover w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 text-white flex items-center justify-center text-xs font-bold">
                  {chat.name?.charAt(0).toUpperCase() || "G"}
                </div>
              )
            ) : otherParticipant?.avatar?.url ? (
              <img
                src={otherParticipant.avatar.url}
                alt={otherParticipant.name}
                className="object-cover w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 text-white flex items-center justify-center text-xs font-bold">
                {otherParticipant?.name
                  ?.match(/\b(\w)/g)
                  ?.slice(0, 2)
                  .join("")
                  .toUpperCase() || "U"}
              </div>
            )}
          </div>
          <div>
            <div className="font-bold">
              {chat.isGroupChat ? chat.name : otherParticipant?.name}
            </div>
            <div className="text-sm dark:text-gray-500">
              {chat.isGroupChat
                ? `${chat.participants.length} participants`
                : "Online"}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-full flex flex-col mx-auto w-[80%]">
        <div className="flex-1 p-4 w-full overflow-y-auto flex flex-col gap-4">
          {sortedMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No messages yet. Start the conversation!
            </div>
          ) : (
            sortedMessages.map((msg) => {
              return (
                <MessageComponent
                  key={msg._id}
                  message={msg}
                  isOwn={msg.sender._id === currentUserId}
                  activeDropdown={activeDropdown}
                  onDropdownToggle={handleDropdownToggle}
                  onExitChat={handleExitChat}
                />
              );
            })
          )}
        </div>

        {/* Message Input */}
        <div className="mt-4 flex w-full justify-center">
          <MessageBox chatId={chat._id} onSendMessage={onSendMessage} />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
