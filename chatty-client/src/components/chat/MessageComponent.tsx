import React, { useState, useEffect, useRef } from "react";
import type { ChatMessageInterface } from "../../types/chat";
import { IoIosArrowDown } from "react-icons/io";
import { GoReply } from "react-icons/go";
import { IoCopyOutline, IoReturnUpForwardOutline } from "react-icons/io5";
import { MdDeleteOutline } from "react-icons/md";

const MessageComponent: React.FC<{
  isOwnMessage?: boolean;
  isGroupChatMessage?: boolean;
  message: ChatMessageInterface;
  deleteChatMessage: (message: ChatMessageInterface) => void;
}> = ({ message, isOwnMessage, isGroupChatMessage, deleteChatMessage }) => {
  const options = [
    { id: "Reply", icon: <GoReply size={16} /> },
    { id: "Copy", icon: <IoCopyOutline size={16} /> },
    { id: "Forward", icon: <IoReturnUpForwardOutline size={16} /> },
    { id: "Delete", icon: <MdDeleteOutline size={16} /> },
  ];

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleOptions = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropdownOpen((prev) => !prev);
  };

  const handleOptionClick = (optionId: string) => {
    if (optionId === "Delete") {
      deleteChatMessage(message);
    }
    setIsDropdownOpen(false);
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const initials = message.sender.username
    ?.match(/\b(\w)/g)
    ?.slice(0, 2)
    .join("")
    .toUpperCase();

  const avatarURL = message?.sender?.avatar?.url;

  return (
    <div
      className={`flex items-end gap-2 ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      {!isOwnMessage && (
        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 text-white flex items-center justify-center text-xs font-bold overflow-hidden">
          {avatarURL ? (
            <img
              src={avatarURL}
              alt={initials}
              className="object-cover w-full h-full"
            />
          ) : (
            initials
          )}
        </div>
      )}

      <div
        className={`relative max-w-[75%] px-4 py-2 text-sm shadow-md group ${
          isOwnMessage
            ? "bg-green-800 text-white rounded-xl rounded-br-none"
            : "bg-gray-200 dark:bg-gray-800 text-black dark:text-white rounded-xl rounded-bl-none"
        }`}
      >
        <div
          className={`absolute top-0 w-0 h-0 border-t-[10px] border-t-transparent ${
            isOwnMessage
              ? "right-0 border-l-[10px] border-l-green-800"
              : "left-0 border-r-[10px] border-r-gray-200 dark:border-r-gray-800"
          }`}
        ></div>

        <div className="flex justify-between items-center">
          {!isOwnMessage && (
            <p className="text-green-500">{message?.sender?.username}</p>
          )}
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={toggleOptions}
              className={`p-1 rounded-full transition-colors group-hover:opacity-100 opacity-0 ${
                isOwnMessage ? "text-white" : "text-gray-600 dark:text-gray-300"
              }`}
            >
              <IoIosArrowDown
                className={`w-4 h-4 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div
                ref={dropdownRef}
                className={`absolute top-full mt-1 bg-white dark:bg-gray-800 text-black dark:text-white text-sm shadow-lg rounded-md overflow-hidden z-50 min-w-[120px] ${
                  isOwnMessage ? "right-0" : "left-0"
                }`}
              >
                {options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleOptionClick(option.id)}
                    className={`block px-3 py-2 w-full text-left transition-colors ${
                      option.id === "Delete"
                        ? "hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-800 dark:hover:text-red-200"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <span>{option.id}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-lg">{message.content}</p>

        {message.attachments.map((att, idx) =>
          att.url.endsWith(".mp3") ? (
            <audio key={idx} controls src={att.url} className="mt-2" />
          ) : (
            <a
              key={idx}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline text-blue-200 block mt-1"
            >
              Attachment {idx + 1}
            </a>
          ),
        )}

        <div className="mt-1 flex justify-end items-center text-[10px] opacity-70">
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {isOwnMessage && (
        <div className="w-8 h-8 rounded-full bg-green-800 text-white flex items-center justify-center text-xs font-bold overflow-hidden">
          {avatarURL ? (
            <img
              src={avatarURL}
              alt={initials}
              className="object-cover w-full h-full"
            />
          ) : (
            initials
          )}
        </div>
      )}
    </div>
  );
};

export default MessageComponent;
