// components/MessageBox.tsx
import React, { useState } from "react";
import { IoAddOutline } from "react-icons/io5";
import VoiceRecorder from "./VoiceRecorder";
import { IoMdSend } from "react-icons/io";

interface MessageBoxProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSend?: () => void;
  chatId: string;
  isTyping?: boolean;
}

const MessageBox: React.FC<MessageBoxProps> = ({
  message,
  onMessageChange,
  onSend,
  chatId,
  isTyping,
}) => {
  const [isRecording, setIsRecording] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSend && !isRecording) {
      onSend();
    }
  };

  const handleSendClick = () => {
    if (onSend && !isRecording) {
      onSend();
    }
  };

  const handleRecordingStateChange = (recording: boolean) => {
    setIsRecording(recording);
  };

  const handleSendRecording = () => {
    // Recording has been sent, reset state
    setIsRecording(false);
  };

  // Show recording interface when recording
  if (isRecording) {
    return (
      <div className="flex w-full max-w-8xl border-2 border-gray-700 bg-gray-900 rounded-full items-center px-3 py-2 gap-3">
        <div className="flex-grow flex justify-center">
          <VoiceRecorder
            chatId={chatId}
            onRecordingStateChange={handleRecordingStateChange}
            onSendRecording={handleSendRecording}
          />
        </div>

        {/* Send button for recording */}
        <button
          onClick={() => {
            // This will trigger the recording to be sent
            // The actual sending is handled by the VoiceRecorder component
            const event = new CustomEvent("sendRecording");
            document.dispatchEvent(event);
          }}
          className="w-10 h-10 text-black rounded-full bg-green-500 p-1 cursor-pointer hover:bg-green-600 transition-colors flex items-center justify-center"
        >
          <IoMdSend className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Normal message input interface
  return (
    <div className="flex w-full max-w-8xl border-2 border-gray-700 bg-gray-900 rounded-full items-center px-3 py-2 gap-3">
      <IoAddOutline className="w-6 h-6 text-gray-400 hover:text-white cursor-pointer" />

      <input
        type="text"
        placeholder="Type a message"
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        onKeyDown={handleKeyPress}
        className="flex-grow bg-transparent text-white outline-none placeholder-gray-400"
      />

      {/* Show voice recorder when not typing, send button when typing */}
      {!message.trim() && !isTyping ? (
        <VoiceRecorder
          chatId={chatId}
          onRecordingStateChange={handleRecordingStateChange}
          onSendRecording={handleSendRecording}
        />
      ) : (
        <button
          onClick={handleSendClick}
          className="w-10 h-10 text-black rounded-full bg-green-500 p-1 cursor-pointer hover:bg-green-600 transition-colors flex items-center justify-center"
        >
          <IoMdSend className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default MessageBox;
