import type { Chat } from "../types/chat";
import { BsThreeDotsVertical } from "react-icons/bs";
import { RiChatNewLine } from "react-icons/ri";
import Button from "./Button";
import { IoMdSearch } from "react-icons/io";
import FormInput from "./FormInput";
import { GrGroup } from "react-icons/gr";
import { useAuth } from "../contexts/AuthContext";
import { formatMessageTime } from "../utils/formatTime";
import { useRef, useEffect, useState } from "react";
const filters = ["All", "Unread", "Favourites", "Groups"] as const;
import { MdOutlineGroupAdd } from "react-icons/md";
import { LuLogOut } from "react-icons/lu";

type ChatListProps = {
  chats: Chat[];
  currentFilter: (typeof filters)[number];
  onFilterChange: (tab: (typeof filters)[number]) => void;
  onSelectChat: (chat: Chat) => void;
  selectedChat: Chat[];
};

const ChatList = ({
  chats,
  currentFilter,
  onFilterChange,
  onSelectChat,
  selectedChat,
}: ChatListProps) => {
  const otpions = [
    { id: "New Group", icon: <MdOutlineGroupAdd size={16} /> },
    { id: "Log Out", icon: <LuLogOut size={16} /> },
  ];

  const { user, logout } = useAuth();

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOptionClick = (id: string) => {
    if (id === "Log Out") {
      logout();
    } else if (id === "New Group") {
      alert("Open New Group Modal");
    }
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-col relative p-4 h-full">
      <div className="flex flex-row">
        <h2 className="text-4xl dark:text-white text-green-500 font-bold mb-4">
          Chatty
        </h2>
        <div className="absolute flex flex-row right-0 gap-4 mr-4">
          <Button variant="icon" className="rounded-full">
            <RiChatNewLine className="w-8 h-8" />
          </Button>
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="icon"
              className="rounded-full"
              onClick={() => setShowDropdown((prev) => !prev)}
            >
              <BsThreeDotsVertical className="w-6 h-6" />
            </Button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 text-black dark:text-white text-sm shadow-lg rounded-lg overflow-hidden z-50">
                {otpions.map((option) => (
                  <button
                    key={option.id}
                    className={`block px-3 py-2 w-full text-left transition-colors ${
                      option.id === "Log Out"
                        ? "hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-800 dark:hover:text-red-200"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    onClick={() => handleOptionClick(option.id)}
                  >
                    <div className="flex items-center gap-4">
                      {option.icon}
                      <span>{option.id}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <FormInput
        type="text"
        className="w-full bg-transparent rounded-full outline-none"
        placeholder="Search or start a new chat"
        icon={<IoMdSearch className="w-5 h-5" />}
      />

      <div className="flex flex-row gap-3 my-4">
        {filters.map((item) => (
          <Button
            key={item}
            variant="outline"
            className="rounded-full"
            isActive={currentFilter === item}
            onClick={() => onFilterChange(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      <div className="mt-4 overflow-y-auto">
        {chats.map((chat) => {
          const otherParticipant = chat.participants.find(
            (p) => p._id !== user?._id,
          );

          const isUnread =
            chat.lastMessage &&
            !chat.lastMessage.readBy?.includes(user?._id ?? "");

          const lastMessageTime = chat.lastMessage?.createdAt
            ? formatMessageTime(chat.lastMessage?.createdAt)
            : "";
          const unreadCount = chat.unreadMessageCount;
          console.log(typeof unreadCount, "unreadCount");
          const displayName = chat.isGroupChat
            ? chat.name
            : otherParticipant?.name;

          const displayInitials =
            !chat.isGroupChat &&
            otherParticipant?.name
              ?.match(/\b(\w)/g)
              ?.slice(0, 2)
              .join("")
              .toUpperCase();
          const avatarUrl = chat.lastMessage?.sender?.avatar?.url;

          return (
            <div
              key={chat._id}
              onClick={() => onSelectChat(chat)}
              className={`flex items-center justify-between gap-6 my-1 p-3 cursor-pointer dark:hover:bg-gray-800 hover:bg-gray-100 rounded-2xl overflow-x-hidden ${selectedChat?._id === chat?._id ? "bg-gray-800" : ""}`}
            >
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-2xl text-white overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Group"
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    displayInitials
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="font-semibold text-base truncate">
                    {displayName}
                  </div>
                  <div
                    className={`truncate w-full max-w-[210px] ${
                      isUnread &&
                      chat?.lastMessage?.sender?._id.toString() !==
                        user?._id.toString()
                        ? "font-semibold text-white"
                        : "text-gray-400"
                    }`}
                  >
                    <p className="truncate" />
                    {chat?.lastMessage?.content || "Click to chat now..."}
                    <p />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 min-w-fit">
                {lastMessageTime && (
                  <span
                    className={`text-xs ${
                      isUnread && unreadCount !== 0
                        ? "text-green-500 font-bold"
                        : "text-gray-400"
                    }`}
                  >
                    {lastMessageTime}
                  </span>
                )}
                {isUnread && unreadCount !== 0 && (
                  <div className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">
                    {unreadCount}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatList;
