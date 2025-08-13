import { useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { IoIosArrowDown } from "react-icons/io";
import { BsInfoCircle } from "react-icons/bs";
import { FiMinusCircle } from "react-icons/fi";
import { FaRegHeart } from "react-icons/fa";
import { MdBlock, MdAttachFile } from "react-icons/md";
import { LuLogOut } from "react-icons/lu";
import { formatMessageTime } from "../../utils/formatTime";
import { ChatListItemInterface } from "../../interfaces/chat";
import { useAuth } from "../../contexts/AuthContext";
import {
  requestHandler,
  getChatObjectMetadata,
  classNames,
  getInitials,
  DeviceType,
} from "../../utils";
import { deleteOneOnOneChat } from "../../api";
import GroupAvatar from "./GroupAvatar";

const ChatListItem: React.FC<{
  chat: ChatListItemInterface;
  onClick: (chat: ChatListItemInterface) => void;
  isActive?: boolean;
  setChatInfoOpen?: boolean;
  unreadCount?: number;
  onChatDelete: (chatId: string) => void;
  activeDropdown: string | null;
  deviceType: DeviceType;
  onDropdownToggle: (
    id: string | null,
    position?: { top: number; left: number },
  ) => void;
}> = ({
  chat,
  onClick,
  isActive,
  setChatInfoOpen,
  unreadCount = 0,
  onChatDelete,
  activeDropdown,
  onDropdownToggle,
  deviceType,
}) => {
  const { user } = useAuth();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDropdownOpen = activeDropdown === chat._id;

  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>(
    { top: 0, left: 0 },
  );
  const metaData = getChatObjectMetadata(chat, user!);
  const initials = getInitials(metaData.title);
  const getAvatarSize = () => {
    switch (deviceType) {
      case "mobile":
        return 10;
      case "tablet":
        return 12;
      default:
        return 14;
    }
  };

  const getTextSizes = () => {
    switch (deviceType) {
      case "mobile":
        return { name: "text-sm", message: "text-xs", time: "text-xs" };
      case "tablet":
        return { name: "text-base", message: "text-sm", time: "text-xs" };
      default:
        return { name: "text-lg", message: "text-sm", time: "text-sm" };
    }
  };

  const textSizes = getTextSizes();

  const options = [
    { id: "About", icon: <BsInfoCircle size={16} /> },
    { id: "Add to Favourite", icon: <FaRegHeart size={16} /> },
    { id: "Clear Chat", icon: <FiMinusCircle size={16} /> },
    ...(chat.isGroupChat
      ? [{ id: "Exit Group", icon: <LuLogOut size={16} /> }]
      : [{ id: "Block", icon: <MdBlock size={16} /> }]),
  ];

  const toggleOptions = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDropdownOpen) {
      onDropdownToggle(null);
    } else if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
      onDropdownToggle(chat._id, { top: rect.bottom + 4, left: rect.left });
    }
  };

  const handleOptionClick = (optionId: string) => {
    if (optionId === "About") {
      onClick(chat);
      setChatInfoOpen(true);
    }
    onDropdownToggle(null);
  };

  const deleteChat = async () => {
    await requestHandler(
      async () => await deleteOneOnOneChat(chat._id),
      null,
      () => {
        onChatDelete(chat._id);
      },
      alert,
    );
  };

  if (!chat) return null;

  return (
    <>
      <div
        role="button"
        onClick={() => onClick(chat)}
        className={classNames(
          "group p-4 my-2 flex justify-between gap-3 items-start cursor-pointer rounded-xl",
          isActive
            ? "dark:bg-gray-800 bg-gray-200"
            : "hover:bg-gray-200 dark:hover:bg-gray-800",
          deviceType === "mobile" ? "p-2" : "",
        )}
      >
        <div className="flex justify-center items-center flex-shrink-0">
          {chat.isGroupChat ? (
            <GroupAvatar
              participants={chat.participants}
              size={getAvatarSize() * 3.2}
            />
          ) : (
            <div
              className={`size-12 rounded-full bg-gray-300 dark:bg-gray-700 text-white flex items-center justify-center text-lg font-bold overflow-hidden outline outline-1 outline-gray-500`}
            >
              {metaData.avatar ? (
                <img
                  src={metaData.avatar}
                  alt={initials}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span
                  className={deviceType === "mobile" ? "text-xs" : "text-sm"}
                >
                  {initials}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="w-full ml-2">
          <div className="flex justify-between">
            <p className="truncate">
              {getChatObjectMetadata(chat, user!).title}
            </p>
            <small className={`${unreadCount > 0 ? "text-green-500" : ""}`}>
              {formatMessageTime(chat.updatedAt)}
            </small>
          </div>
          <div className="flex justify-between">
            <div className="w-full flex flex-row items-center truncate">
              {chat.lastMessage && chat.lastMessage.attachments.length > 0 && (
                <MdAttachFile className="h-4 w-4 flex-shrink-0" />
              )}
              <small
                className={`lastmessage text-md break-words whitespace-normal ${unreadCount > 0 ? "text-green-500" : ""}`}
              >
                {getChatObjectMetadata(chat, user!).lastMessage.length > 35
                  ? `${getChatObjectMetadata(chat, user!).lastMessage.substring(0, 35)}.....`
                  : getChatObjectMetadata(chat, user!).lastMessage}
              </small>
            </div>
            {unreadCount > 0 && (
              <span className="bg-green-500 h-2 w-2 flex-shrink-0 p-2 text-white text-base rounded-full inline-flex justify-center items-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            <button
              ref={buttonRef}
              onClick={toggleOptions}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-black/20"
            >
              <IoIosArrowDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isDropdownOpen &&
        ReactDOM.createPortal(
          <div
            className="fixed bg-white dark:bg-gray-800 text-black dark:text-white text-sm shadow-lg rounded-md overflow-hidden z-[999] min-w-[150px]"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                className={`block px-3 py-2 w-full text-left transition-colors ${
                  option.id === "Exit Group" ||
                  option.id === "Clear Chat" ||
                  option.id === "Block"
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
          </div>,
          document.body,
        )}
    </>
  );
};

export default ChatListItem;
