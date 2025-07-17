import { useRef, useEffect, useState } from "react";
import { IoIosArrowDown } from "react-icons/io";
import { BsInfoCircle } from "react-icons/bs";
import { FiMinusCircle } from "react-icons/fi";
import { FaRegHeart } from "react-icons/fa";
import { MdBlock, MdAttachFile } from "react-icons/md";
import { LuLogOut } from "react-icons/lu";
import { formatMessageTime } from "../../utils/formatTime";
import { ChatListItemInterface } from "../../interfaces/chat";
import { useAuth } from "../../contexts/AuthContext";
import { requestHandler, getChatObjectMetadata, classNames } from "../../utils";
import { deleteOneOnOneChat } from "../../api";

const ChatListItem: React.FC<{
  chat: ChatListItemInterface;
  onClick: (chat: ChatListItemInterface) => void;
  isActive?: boolean;
  unreadCount?: number;
  onChatDelete: (chatId: string) => void;
  activeDropdown: string | null;
  onDropdownToggle: (id: string | null) => void;
}> = ({
  chat,
  onClick,
  isActive,
  unreadCount = 0,
  onChatDelete,
  activeDropdown,
  onDropdownToggle,
}) => {
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDropdownOpen = activeDropdown === chat._id;

  const [openGroupInfo, setOpenGroupInfo] = useState(false);

  const options = [
    { id: "About", icon: <BsInfoCircle size={16} /> },
    { id: "Clear Chat", icon: <FiMinusCircle size={16} /> },
    { id: "Add to Favourite", icon: <FaRegHeart size={16} /> },
    ...(chat.isGroupChat
      ? [{ id: "Exit Group", icon: <LuLogOut size={16} /> }]
      : [{ id: "Block", icon: <MdBlock size={16} /> }]),
  ];

  const toggleOptions = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDropdownToggle(isDropdownOpen ? null : chat._id);
  };

  const handleOptionClick = (optionId: string) => {
    if (optionId === "About") {
      setOpenGroupInfo(true);
    }
    // Add logic for other options here if needed
    onDropdownToggle(null); // close dropdown after click
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onDropdownToggle(null);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (!chat) return null;

  return (
    <>
      <div
        role="button"
        onClick={() => onClick(chat)}
        className={classNames(
          "group p-4 my-2 flex justify-between gap-3 items-start cursor-pointer rounded-3xl",
          isActive ? "bg-gray-800" : "hover:bg-gray-800",
        )}
      >
        {/* Avatar */}
        <div className="flex justify-center items-center flex-shrink-0">
          {chat.isGroupChat ? (
            <div className="w-12 relative h-12 flex-shrink-0 flex justify-start items-center">
              {chat.participants.slice(0, 3).map((p, i) => (
                <img
                  key={p._id}
                  src={p.avatar.url}
                  className={classNames(
                    "w-8 h-8 border-[1px] border-white rounded-full absolute outline outline-4 outline-dark",
                    i === 0
                      ? "left-0 z-[3]"
                      : i === 1
                        ? "left-2.5 z-[2]"
                        : "left-[18px] z-[1]",
                  )}
                />
              ))}
            </div>
          ) : (
            <img
              src={getChatObjectMetadata(chat, user!).avatar}
              className="w-12 h-12 rounded-full"
            />
          )}
        </div>

        {/* Message preview */}
        <div className="w-full">
          <div className="flex justify-between">
            <p className="truncate">
              {getChatObjectMetadata(chat, user!).title}
            </p>
            <small className={`${unreadCount > 0 ? "text-green-500" : ""}`}>
              {formatMessageTime(chat.updatedAt)}
            </small>
          </div>
          <div className="flex justify-between">
            <div className="w-full flex justify-between">
              {chat.lastMessage && chat.lastMessage.attachments.length > 0 && (
                <MdAttachFile className="h-3 w-3 mr-2 flex-shrink-0" />
              )}
              <small
                className={`truncate text-md ${unreadCount > 0 ? "text-green-500" : ""}`}
              >
                {getChatObjectMetadata(chat, user!).lastMessage}
              </small>
            </div>
            {unreadCount > 0 && (
              <span className="bg-green-500 h-2 w-2 flex-shrink-0 p-2 text-white text-base rounded-full inline-flex justify-center items-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={toggleOptions}
                className="group-hover:block hidden p-1 rounded-full hover:bg-black/20 transition-colors"
              >
                <IoIosArrowDown className="w-4 h-4" />
              </button>

              {isDropdownOpen && (
                <div className="absolute mt-1 bg-white dark:bg-gray-800 text-black dark:text-white text-sm shadow-lg rounded-md overflow-hidden z-50 min-w-[150px]">
                  {options.map((option) => (
                    <button
                      ref={dropdownRef}
                      key={option.id}
                      onClick={() => handleOptionClick(option.id)}
                      className={`block px-3 py-2 w-full text-left transition-colors ${
                        option.id === "Exit"
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
        </div>
      </div>
    </>
  );
};

export default ChatListItem;
