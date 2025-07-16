// components/MessageBox.tsx
import React from "react";
import { IoAddOutline } from "react-icons/io5";
import VoiceRecorder from "./VoiceRecorder";
import { IoMdSend } from "react-icons/io";

interface MessageBoxProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSend?: () => void;
  chatId: string;
}

const MessageBox: React.FC<MessageBoxProps> = ({
  message,
  onMessageChange,
  onSend,
  chatId,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSend) {
      onSend();
    }
  };

  return (
    <div className="flex w-full max-w-8xl border-2 border-gray-700 bg-gray-900 rounded-full items-center px-3 py-2 gap-3">
      <IoAddOutline className="w-6 h-6 text-gray-400 hover:text-white cursor-pointer" />
      <VoiceRecorder chatId={chatId} />
      <input
        type="text"
        placeholder="Type a message"
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        onKeyDown={handleKeyPress}
        className="flex-grow bg-transparent text-white outline-none placeholder-gray-400"
      />
      <IoMdSend
        className="w-10 h-10 text-black rounded-full bg-green-500 p-1 cursor-pointer"
        onClick={onSend}
      />
    </div>
  );
};

export default MessageBox;
