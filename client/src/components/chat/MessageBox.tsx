import React, { useState, useRef } from "react";
import {
  IoAddOutline,
  IoDocumentOutline,
  IoCloseOutline,
} from "react-icons/io5";
import VoiceRecorder from "./VoiceRecorder";
import { IoMdSend } from "react-icons/io";

interface MessageBoxProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSend?: () => void;
  onFileSend?: (file: File, message?: string) => void; // New prop for file sending
  chatId: string;
  isTyping?: boolean;
}

const MessageBox: React.FC<MessageBoxProps> = ({
  message,
  onMessageChange,
  onSend,
  onFileSend,
  chatId,
  isTyping,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isRecording) {
      handleSendClick();
    }
  };

  const handleSendClick = () => {
    if (selectedFile && onFileSend) {
      // Send file with optional message
      onFileSend(selectedFile, message.trim() || undefined);
      setSelectedFile(null);
      onMessageChange("");
    } else if (onSend && message.trim()) {
      // Send regular message
      onSend();
    }
  };

  const handleRecordingStateChange = (recording: boolean) => {
    setIsRecording(recording);
  };

  const handleSendRecording = () => {
    setIsRecording(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    // Reset the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
        <button
          onClick={() => {
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
    <div className="flex flex-col w-full max-w-8xl">
      {/* File Preview */}
      {selectedFile && (
        <div className="mb-2 p-3 bg-gray-800 rounded-lg border border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IoDocumentOutline className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white text-sm font-medium">
                  {selectedFile.name}
                </p>
                <p className="text-gray-400 text-xs">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <button
              onClick={removeSelectedFile}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <IoCloseOutline className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex border-2 border-gray-700 bg-gray-900 rounded-full items-center px-3 py-2 gap-3">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="*/*" // You can restrict file types here, e.g., "image/*,application/pdf"
        />

        {/* Attachment button */}
        <IoAddOutline
          className="w-6 h-6 text-gray-400 hover:text-white cursor-pointer transition-colors"
          onClick={handleAttachmentClick}
        />

        <input
          type="text"
          placeholder={selectedFile ? "Add a caption..." : "Type a message"}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-grow bg-transparent text-white outline-none placeholder-gray-400"
        />

        {/* Show voice recorder when no message and no file, send button otherwise */}
        {!message.trim() && !selectedFile && !isTyping ? (
          <VoiceRecorder
            chatId={chatId}
            onRecordingStateChange={handleRecordingStateChange}
            onSendRecording={handleSendRecording}
          />
        ) : (
          <button
            onClick={handleSendClick}
            disabled={!message.trim() && !selectedFile}
            className="w-10 h-10 text-black rounded-full bg-green-500 p-1 cursor-pointer hover:bg-green-600 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IoMdSend className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageBox;
