import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  MoreVertical,
  MessageCircle,
  Search,
  ArrowLeft,
  UserPlus,
  LogOut,
  X,
} from "lucide-react";

// No dummy data - use props/context from your app

// Constants
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

const FILTERS = ["All", "Unread", "Favourites", "Groups"];

// Device type detection
const getDeviceType = (width) => {
  if (width < BREAKPOINTS.md) return "mobile";
  if (width < BREAKPOINTS.lg) return "tablet";
  if (width < BREAKPOINTS["2xl"]) return "desktop";
  return "large-desktop";
};

// Utility functions
const classNames = (...classes) => classes.filter(Boolean).join(" ");

const getChatObjectMetadata = (chat, user) => {
  if (chat.isGroupChat) {
    return {
      title: chat.name || "Group Chat",
      description: `${chat.participants?.length || 0} members`,
      avatar: null,
    };
  }
  const otherUser = chat.participants?.find((p) => p._id !== user?._id);
  return {
    title: otherUser?.name || "Unknown User",
    description: "online",
    avatar: otherUser?.avatar,
  };
};

const getInitials = (name) => {
  return (
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "??"
  );
};

// Components
// const Button = ({
//   children,
//   variant = "default",
//   className = "",
//   isActive,
//   ...props
// }) => {
//   const baseClasses =
//     "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500";
//   const variants = {
//     default: "bg-green-500 text-white hover:bg-green-600",
//     outline: `border-2 border-gray-300 dark:border-gray-600 ${isActive ? "bg-green-500 text-white border-green-500" : "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700"}`,
//     icon: "p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full",
//   };
//
//   return (
//     <button
//       className={classNames(baseClasses, variants[variant], className)}
//       {...props}
//     >
//       {children}
//     </button>
//   );
// };
//
// const FormInput = ({ icon, className, ...props }) => (
//   <div className="relative">
//     {icon && (
//       <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
//         {icon}
//       </div>
//     )}
//     <input
//       className={classNames(
//         "w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
//         icon && "pl-10",
//         className,
//       )}
//       {...props}
//     />
//   </div>
// );
//
// const ChatListItem = ({ chat, isActive, onClick, unreadCount = 0, user }) => {
//   const chatMetadata = getChatObjectMetadata(chat, user);
//   const initials = getInitials(chatMetadata.title);
//
//   return (
//     <div
//       className={classNames(
//         "flex items-center gap-3 p-3 cursor-pointer rounded-lg mb-2 transition-colors",
//         isActive
//           ? "bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500"
//           : "hover:bg-gray-100 dark:hover:bg-gray-700",
//       )}
//       onClick={() => onClick(chat)}
//     >
//       <div className="relative">
//         <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-white font-bold">
//           {chatMetadata.avatar ? (
//             <img
//               src={chatMetadata.avatar}
//               alt={initials}
//               className="w-full h-full rounded-full object-cover"
//             />
//           ) : (
//             initials
//           )}
//         </div>
//         {unreadCount > 0 && (
//           <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
//             {unreadCount > 9 ? "9+" : unreadCount}
//           </div>
//         )}
//       </div>
//
//       <div className="flex-1 min-w-0">
//         <p className="font-semibold text-gray-900 dark:text-white truncate">
//           {chatMetadata.title}
//         </p>
//         <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
//           {chat.lastMessage?.content || "No messages yet"}
//         </p>
//       </div>
//
//       <div className="text-xs text-gray-400">
//         {chat.lastMessage &&
//           new Date(chat.lastMessage.createdAt).toLocaleDateString()}
//       </div>
//     </div>
//   );
// };
//
// const MessageComponent = ({ message, isOwnMessage }) => (
//   <div
//     className={classNames(
//       "flex",
//       isOwnMessage ? "justify-end" : "justify-start",
//     )}
//   >
//     <div
//       className={classNames(
//         "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
//         isOwnMessage
//           ? "bg-green-500 text-white"
//           : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white",
//       )}
//     >
//       {!isOwnMessage && (
//         <p className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">
//           {message.sender.name}
//         </p>
//       )}
//       <p>{message.content}</p>
//       <p className="text-xs opacity-75 mt-1">
//         {new Date(message.createdAt).toLocaleTimeString([], {
//           hour: "2-digit",
//           minute: "2-digit",
//         })}
//       </p>
//     </div>
//   </div>
// );
//
// const MessageBox = ({ message, onMessageChange, onSend }) => (
//   <div className="flex gap-2 w-full">
//     <input
//       type="text"
//       value={message}
//       onChange={(e) => onMessageChange(e.target.value)}
//       placeholder="Type a message..."
//       className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
//       onKeyPress={(e) => e.key === "Enter" && onSend()}
//     />
//     <Button onClick={onSend}>Send</Button>
//   </div>
// );
//
// const ChatInfo = ({ chat, onClose, user }) => {
//   if (!chat) return null;
//
//   const chatMetadata = getChatObjectMetadata(chat, user);
//   const initials = getInitials(chatMetadata.title);
//
//   return (
//     <div className="p-4 h-full bg-white dark:bg-gray-900">
//       <div className="flex items-center justify-between mb-6">
//         <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
//           Chat Info
//         </h3>
//         <Button variant="icon" onClick={onClose}>
//           <X className="w-5 h-5" />
//         </Button>
//       </div>
//
//       <div className="text-center mb-6">
//         <div className="w-20 h-20 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
//           {chatMetadata.avatar ? (
//             <img
//               src={chatMetadata.avatar}
//               alt={initials}
//               className="w-full h-full rounded-full object-cover"
//             />
//           ) : (
//             initials
//           )}
//         </div>
//         <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
//           {chatMetadata.title}
//         </h4>
//         <p className="text-gray-500 dark:text-gray-400">
//           {chatMetadata.description}
//         </p>
//       </div>
//
//       <div className="space-y-4">
//         <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
//           <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
//             Members
//           </h5>
//           {chat.participants.map((participant) => (
//             <div key={participant._id} className="flex items-center gap-3 py-2">
//               <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-white font-bold text-sm">
//                 {getInitials(participant.name)}
//               </div>
//               <span className="text-gray-900 dark:text-white">
//                 {participant.name}
//               </span>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// Main Chat Component - integrate with your existing props/context
const ResponsiveChatApp = ({
  user,
  chats = [],
  currentChat,
  messages = [],
  onSelectChat,
  onCloseChat,
  onSendMessage,
  onLogout,
}) => {
  // Device detection
  const [deviceType, setDeviceType] = useState("desktop");
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Mobile view states
  const [mobileView, setMobileView] = useState("chat-list"); // "chat-list" | "chat-messages" | "chat-info"

  // App state
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const dropdownRef = useRef(null);

  // Device type detection
  const detectDeviceType = useCallback(() => {
    const width = window.innerWidth;
    const newDeviceType = getDeviceType(width);

    setDeviceType(newDeviceType);
    setIsMobile(newDeviceType === "mobile");
    setIsTablet(newDeviceType === "tablet");
  }, []);

  useEffect(() => {
    detectDeviceType();

    const handleResize = () => {
      detectDeviceType();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [detectDeviceType]);

  // Filtered chats
  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      if (searchQuery) {
        const chatMetadata = getChatObjectMetadata(chat, user);
        if (
          !chatMetadata.title.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }
      }

      switch (filter) {
        case "Groups":
          return chat.isGroupChat;
        case "Unread":
          return false; // Implement your unread logic here
        case "Favourites":
          return true; // Implement your favorites logic here
        default:
          return true;
      }
    });
  }, [chats, searchQuery, filter, user]);

  // Handlers
  const selectChat = useCallback(
    (chat) => {
      if (currentChat?._id === chat._id) return;

      onSelectChat?.(chat);
      setIsInfoOpen(false);

      if (isMobile) {
        setMobileView("chat-messages");
      }
    },
    [currentChat, isMobile, onSelectChat],
  );

  const closeCurrentChat = useCallback(() => {
    onCloseChat?.();
    setMessage("");
    setIsInfoOpen(false);

    if (isMobile) {
      setMobileView("chat-list");
    }
  }, [isMobile, onCloseChat]);

  const openChatInfo = useCallback(() => {
    if (isMobile) {
      setMobileView("chat-info");
    } else if (isTablet) {
      setMobileView("chat-info");
    } else {
      setIsInfoOpen(true);
    }
  }, [isMobile, isTablet]);

  const handleOptionClick = useCallback(
    (option) => {
      if (option === "Log Out") {
        onLogout?.();
      } else if (option === "New Group") {
        // Implement your new group logic here
        alert("Opening new group modal...");
      }
      setShowDropdown(false);
    },
    [onLogout],
  );

  const sendMessage = useCallback(() => {
    if (!message.trim()) return;

    onSendMessage?.(message);
    setMessage("");
  }, [message, onSendMessage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Render functions
  const renderChatHeader = () => {
    if (!currentChat) return null;

    const chatMetadata = getChatObjectMetadata(currentChat, user);
    const initials = getInitials(chatMetadata.title);

    return (
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center gap-3">
        {(isMobile || isTablet) && (
          <Button variant="icon" onClick={closeCurrentChat}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}

        <div
          className="flex items-center gap-3 cursor-pointer flex-1"
          onClick={openChatInfo}
        >
          <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-white font-bold">
            {chatMetadata.avatar ? (
              <img
                src={chatMetadata.avatar}
                alt={initials}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {chatMetadata.title}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {chatMetadata.description}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderChatList = () => (
    <div
      className={classNames(
        "flex flex-col bg-white dark:bg-gray-900 h-full",
        isMobile
          ? "w-full"
          : "w-80 border-r border-gray-200 dark:border-gray-700",
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-green-500">QueeTalk</h1>
          <div className="flex gap-2">
            <Button variant="icon">
              <MessageCircle className="w-5 h-5" />
            </Button>

            <div className="relative" ref={dropdownRef}>
              <Button
                variant="icon"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <MoreVertical className="w-5 h-5" />
              </Button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden z-50">
                  <button
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    onClick={() => handleOptionClick("New Group")}
                  >
                    <UserPlus className="w-4 h-4" />
                    New Group
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 flex items-center gap-2"
                    onClick={() => handleOptionClick("Log Out")}
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <FormInput
          type="text"
          placeholder="Search or start a new chat"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-5 h-5" />}
        />
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((item) => (
            <Button
              key={item}
              variant="outline"
              isActive={filter === item}
              onClick={() => setFilter(item)}
              className="whitespace-nowrap"
            >
              {item}
            </Button>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredChats.map((chat) => (
          <ChatListItem
            key={chat._id}
            chat={chat}
            user={user}
            isActive={chat._id === currentChat?._id}
            onClick={selectChat}
            unreadCount={0}
          />
        ))}
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-4">
        <MessageCircle className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Welcome to QueeTalk
      </h2>
      <p className="text-gray-500 dark:text-gray-400 text-center">
        Select a chat from the sidebar to start messaging
      </p>
    </div>
  );

  const renderChatMessages = () => (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900">
      {renderChatHeader()}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageComponent
              key={msg._id}
              message={msg}
              isOwnMessage={msg.sender?._id === user?._id}
            />
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <MessageBox
          message={message}
          onMessageChange={setMessage}
          onSend={sendMessage}
        />
      </div>
    </div>
  );

  const renderChatInfo = () => (
    <div
      className={classNames(
        "bg-white dark:bg-gray-900 h-full",
        isMobile || isTablet
          ? "w-full"
          : "w-80 border-l border-gray-200 dark:border-gray-700",
      )}
    >
      <ChatInfo
        chat={currentChat}
        user={user}
        onClose={() => {
          if (isMobile) {
            setMobileView("chat-messages");
          } else if (isTablet) {
            setMobileView("chat-messages");
          } else {
            setIsInfoOpen(false);
          }
        }}
      />
    </div>
  );

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-screen w-full bg-gray-50 dark:bg-gray-900">
        {mobileView === "chat-list" && renderChatList()}
        {mobileView === "chat-messages" && currentChat && renderChatMessages()}
        {mobileView === "chat-messages" && !currentChat && renderEmptyState()}
        {mobileView === "chat-info" && currentChat && renderChatInfo()}
      </div>
    );
  }

  // Tablet layout
  if (isTablet) {
    return (
      <div className="h-screen w-full flex bg-gray-50 dark:bg-gray-900">
        {mobileView !== "chat-info" && renderChatList()}

        <div className="flex-1">
          {mobileView === "chat-info" && currentChat
            ? renderChatInfo()
            : currentChat
              ? renderChatMessages()
              : renderEmptyState()}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="h-screen w-full flex bg-gray-50 dark:bg-gray-900">
      {renderChatList()}

      <div className="flex-1 flex">
        {currentChat ? renderChatMessages() : renderEmptyState()}
        {isInfoOpen && currentChat && renderChatInfo()}
      </div>
    </div>
  );
};

export default ResponsiveChatApp;
