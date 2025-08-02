import React, { useState, useEffect, useRef } from "react";
import type { ChatMessageInterface } from "../../types/chat";
import { IoIosArrowDown } from "react-icons/io";
import { GoReply } from "react-icons/go";
import { IoCopyOutline, IoReturnUpForwardOutline } from "react-icons/io5";
import { MdDeleteOutline } from "react-icons/md";
import AttachmentRenderer from "./AttachmentRender";
import { FiDownload } from "react-icons/fi";

const MessageComponent: React.FC<{
  isOwnMessage?: boolean;
  isGroupChatMessage?: boolean;
  message: ChatMessageInterface;
  deleteChatMessage: (message: ChatMessageInterface) => void;
}> = ({ message, isOwnMessage, isGroupChatMessage, deleteChatMessage }) => {
  const options = [
    { id: "Reply", icon: <GoReply size={16} /> },
    ...(message.attachments.length > 0
      ? [{ id: "Download", icon: <FiDownload size={16} /> }]
      : [{ id: "Copy", icon: <IoCopyOutline size={16} /> }]),
    { id: "Forward", icon: <IoReturnUpForwardOutline size={16} /> },
    ...(isOwnMessage
      ? [{ id: "Delete", icon: <MdDeleteOutline size={16} /> }]
      : []),
  ];

  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = useState(false);
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

  useEffect(() => {
    if (isDropdownOpen && dropdownRef.current && buttonRef.current) {
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const dropdownHeight = dropdownRect.height;

      // If not enough space below, open upward
      if (spaceBelow < dropdownHeight + 16) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }
    }
  }, [isDropdownOpen]);

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
        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 text-white flex items-center justify-center text-xs font-bold overflow-hidden outline outline-1 outline-gray-500">
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
        className={`relative max-w-[75%] px-2 pt-2 text-sm shadow-md group ${
          isOwnMessage
            ? "bg-green-800 text-white rounded-xl rounded-br-none"
            : "dark:bg-gray-800 text-black dark:text-white rounded-xl rounded-bl-none"
        }`}
      >
        <div
          className={`absolute top-0 w-0 h-0 border-t-[10px] border-t-transparent ${
            isOwnMessage
              ? "right-0 border-l-[10px] border-l-green-800"
              : "left-0 border-r-[10px] border-r-gray-200 dark:border-r-gray-800"
          }`}
        ></div>
        <div className="absolute right-0">
          <button
            ref={buttonRef}
            onClick={toggleOptions}
            className={`pr-1 rounded-full transition-colors group-hover:opacity-100 opacity-0 ${
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
              className={`absolute ${
                dropUp ? "bottom-full mb-1" : "top-full mt-1"
              } bg-white dark:bg-gray-800 text-black dark:text-white text-sm shadow-lg rounded-md overflow-hidden z-50 min-w-[120px] ${
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
        <div className="flex justify-between items-center">
          {!isOwnMessage && isGroupChatMessage && (
            <p className="text-green-500 text-sm mr-3">
              {message?.sender?.username}
            </p>
          )}
        </div>

        {Array.isArray(message.attachments) &&
          message.attachments.length > 0 && (
            <AttachmentRenderer
              attachments={
                Array.isArray(message.attachments)
                  ? message.attachments
                  : [message.attachments]
              }
            />
          )}
        <p
          className={`text-lg mr-3 ${message.attachments.length > 0 ? "mt-1" : ""}`}
        >
          {message.content}
        </p>

        <div className="flex justify-end items-center text-[10px] opacity-70">
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {isOwnMessage ? (
            <div className="flex items-center justify-start">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 -0.5 25 25"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.03033 11.4697C4.73744 11.1768 4.26256 11.1768 3.96967 11.4697C3.67678 11.7626 3.67678 12.2374 3.96967 12.5303L5.03033 11.4697ZM8.5 16L7.96967 16.5303C8.26256 16.8232 8.73744 16.8232 9.03033 16.5303L8.5 16ZM17.0303 8.53033C17.3232 8.23744 17.3232 7.76256 17.0303 7.46967C16.7374 7.17678 16.2626 7.17678 15.9697 7.46967L17.0303 8.53033ZM9.03033 11.4697C8.73744 11.1768 8.26256 11.1768 7.96967 11.4697C7.67678 11.7626 7.67678 12.2374 7.96967 12.5303L9.03033 11.4697ZM12.5 16L11.9697 16.5303C12.2626 16.8232 12.7374 16.8232 13.0303 16.5303L12.5 16ZM21.0303 8.53033C21.3232 8.23744 21.3232 7.76256 21.0303 7.46967C20.7374 7.17678 20.2626 7.17678 19.9697 7.46967L21.0303 8.53033ZM3.96967 12.5303L7.96967 16.5303L9.03033 15.4697L5.03033 11.4697L3.96967 12.5303ZM9.03033 16.5303L17.0303 8.53033L15.9697 7.46967L7.96967 15.4697L9.03033 16.5303ZM7.96967 12.5303L11.9697 16.5303L13.0303 15.4697L9.03033 11.4697L7.96967 12.5303ZM13.0303 16.5303L21.0303 8.53033L19.9697 7.46967L11.9697 15.4697L13.0303 16.5303Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          ) : null}
        </div>
      </div>

      {isOwnMessage && (
        <div className="w-10 h-10 rounded-full bg-green-800 text-white flex items-center justify-center text-xs font-bold overflow-hidden outline outline-2 outline-black">
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
