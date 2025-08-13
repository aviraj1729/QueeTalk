import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { RiChatNewLine } from "react-icons/ri";
import { IoMdSearch, IoMdArrowBack } from "react-icons/io";
import { MdOutlineGroupAdd } from "react-icons/md";
import { LuLogOut } from "react-icons/lu";
import { FiXCircle } from "react-icons/fi";
import type { DeviceType } from "../utils";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import Typing from "../components/chat/Typing";
import ChatListItem from "../components/chat/ChatListItem";
import MessageComponent from "../components/chat/MessageComponent";
import MessageBox from "../components/chat/MessageBox";
import AddChat from "../components/chat/AddChat";
import {
  getUserChats,
  getChatMessages,
  sendMessage,
  deleteMessage,
} from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import type {
  ChatMessageInterface,
  ChatListItemInterface,
} from "../interfaces/chat";
import {
  BREAKPOINTS,
  getLayoutConfig,
  LocalStorage,
  classNames,
  getChatObjectMetadata,
  getInitials,
  requestHandler,
} from "../utils";
import ChatInfo from "../components/chat/ChatInfo";
import GroupAvatar from "../components/chat/GroupAvatar";

// Constants
const SOCKET_EVENTS = {
  CONNECTED: "connected",
  DISCONNECT: "disconnect",
  JOIN_CHAT: "joinChat",
  NEW_CHAT: "newChat",
  TYPING: "typing",
  STOP_TYPING: "stopTyping",
  MESSAGE_RECEIVED: "messageReceived",
  LEAVE_CHAT: "leaveChat",
  UPDATE_GROUP_NAME: "updateGroupName",
  MESSAGE_DELETE: "messageDeleted",
} as const;

const FILTERS = ["All", "Unread", "Favourites", "Groups"] as const;
const TYPING_TIMEOUT = 3000;

type FilterType = (typeof FILTERS)[number];

// Mobile view states
type MobileView = "chat-list" | "chat-messages" | "chat-info";

const ChatPage = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();

  // Refs
  const currentChat = useRef<ChatListItemInterface | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // UI State
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [openAddChat, setOpenAddChat] = useState(false);
  const [filter, setFilter] = useState<FilterType>("All");
  const [localSearchQuery, setLocalSearchQuery] = useState("");

  // Mobile responsive state
  const [deviceType, setDeviceType] = useState<DeviceType>("Desktop");
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const [mobileView, setMobileView] = useState("chat-list");

  // Loading States
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Socket State
  const [isConnected, setIsConnected] = useState(false);

  // Chat State
  const [chats, setChats] = useState<ChatListItemInterface[]>([]);
  const [messages, setMessages] = useState<ChatMessageInterface[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<ChatMessageInterface[]>(
    [],
  );
  const [isTyping, setIsTyping] = useState(false);
  const [selfTyping, setSelfTyping] = useState(false);
  const [message, setMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Check if screen is mobile/tablet
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Memoized values
  const options = useMemo(
    () => [
      { id: "New Group", icon: <MdOutlineGroupAdd size={16} /> },
      { id: "Log Out", icon: <LuLogOut size={16} /> },
    ],
    [],
  );
  const getDeviceType = (width) => {
    if (width < BREAKPOINTS.md) return "mobile";
    if (width < BREAKPOINTS.lg) return "tablet";
    if (width < BREAKPOINTS.xl) return "desktop";
    if (width < BREAKPOINTS["2xl"]) return "large-desktop";
    return "4k-desktop";
  };

  const detectDeviceType = useCallback(() => {
    const width = window.innerWidth;
    console.log(width);
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

  const filteredChats = useMemo(() => {
    if (!user) return [];

    return chats.filter((chat) => {
      // Apply search filter
      if (localSearchQuery) {
        const chatTitle = getChatObjectMetadata(
          chat,
          user,
        ).title?.toLowerCase();
        if (!chatTitle?.includes(localSearchQuery.toLowerCase())) {
          return false;
        }
      }

      // Apply type filter
      switch (filter) {
        case "Groups":
          return chat.isGroupChat;
        case "Unread":
          return unreadMessages.some((msg) => msg.chat === chat._id);
        case "Favourites":
          // Add logic for favorites when implemented
          return true;
        default:
          return true;
      }
    });
  }, [chats, localSearchQuery, filter, unreadMessages, user]);

  // Callbacks
  const closeCurrentChat = useCallback(() => {
    if (currentChat.current?._id && socket) {
      socket.emit(SOCKET_EVENTS.LEAVE_CHAT, currentChat.current._id);
    }
    currentChat.current = null;
    LocalStorage.remove("currentChat");
    setMessages([]);
    setMessage("");
    setAttachedFiles([]);
    setIsTyping(false);
    setSelfTyping(false);

    // Handle mobile navigation
    if (isMobile) {
      setMobileView("chat-list");
    }
  }, [socket, isMobile]);

  const openGroupInfo = useCallback(() => {
    if (isMobile) {
      setMobileView("chat-info");
    } else {
      setIsInfoOpen(true);
    }
  }, [isMobile]);

  const handleOptionClick = useCallback(
    (id: string) => {
      if (id === "Log Out") {
        logout();
      } else if (id === "New Group") {
        // TODO: Open new group modal
        alert("Open New Group Modal");
      }
      setShowDropdown(false);
    },
    [logout],
  );
  const layoutConfig = getLayoutConfig(deviceType);

  const updateChatLastMessage = useCallback(
    (chatId: string, newMessage: ChatMessageInterface) => {
      setChats((prevChats) => {
        const chatIndex = prevChats.findIndex((chat) => chat._id === chatId);
        if (chatIndex === -1) return prevChats;

        const updatedChat = {
          ...prevChats[chatIndex],
          lastMessage: newMessage,
          updatedAt: newMessage.updatedAt,
        };

        // Move updated chat to top
        return [
          updatedChat,
          ...prevChats.filter((_, index) => index !== chatIndex),
        ];
      });
    },
    [],
  );

  const updateChatLastMessageOnDeletion = useCallback(
    async (chatId: string, deletedMessage: ChatMessageInterface) => {
      setChats((prevChats) => {
        const chatToUpdate = prevChats.find((chat) => chat._id === chatId);
        if (
          !chatToUpdate ||
          chatToUpdate.lastMessage?._id !== deletedMessage._id
        ) {
          return prevChats;
        }

        // Fetch new last message
        requestHandler(
          () => getChatMessages(chatId),
          null,
          (response) => {
            const { data } = response;
            setChats((currentChats) =>
              currentChats.map((chat) =>
                chat._id === chatId ? { ...chat, lastMessage: data[0] } : chat,
              ),
            );
          },
          alert,
        );

        return prevChats;
      });
    },
    [],
  );

  const getChats = useCallback(async () => {
    await requestHandler(
      getUserChats,
      setLoadingChats,
      (response) => {
        const { data } = response;
        setChats(data || []);
      },
      alert,
    );
  }, []);

  const getMessages = useCallback(async () => {
    if (!currentChat.current?._id) {
      alert("No chat is selected");
      return;
    }
    if (!socket) {
      alert("Socket not available");
      return;
    }

    socket.emit(SOCKET_EVENTS.JOIN_CHAT, currentChat.current._id);

    // Clear unread messages for current chat
    setUnreadMessages((prev) =>
      prev.filter((msg) => msg.chat !== currentChat.current?._id),
    );

    await requestHandler(
      () => getChatMessages(currentChat.current?._id || ""),
      setLoadingMessages,
      (response) => {
        const { data } = response;
        setMessages(data || []);
      },
      alert,
    );
  }, [socket]);

  const sendChatMessage = useCallback(
    async (customMessage?: string, customFiles?: File[]) => {
      const msg = customMessage ?? message;
      const files = customFiles ?? attachedFiles;

      if (!msg.trim() && files.length === 0) {
        alert("Please enter a message or attach files");
        return;
      }

      if (!currentChat.current?._id) {
        alert("No chat selected");
        return;
      }

      if (!socket) {
        alert("Socket not available");
        return;
      }

      socket.emit(SOCKET_EVENTS.STOP_TYPING, currentChat.current._id);

      await requestHandler(
        () => sendMessage(currentChat.current?._id || "", msg, files),
        null,
        (response) => {
          const newMessage = response.data;
          setMessage("");
          setAttachedFiles([]);
          setMessages((prev) => [newMessage, ...prev]);
          updateChatLastMessage(currentChat.current?._id || "", newMessage);
        },
        alert,
      );
    },
    [message, attachedFiles, socket, updateChatLastMessage],
  );

  const deleteChatMessage = useCallback(
    async (messageToDelete: ChatMessageInterface) => {
      await requestHandler(
        () => deleteMessage(messageToDelete.chat, messageToDelete._id),
        null,
        (response) => {
          setMessages((prev) =>
            prev.filter((msg) => msg._id !== response.data._id),
          );
          updateChatLastMessageOnDeletion(
            messageToDelete.chat,
            messageToDelete,
          );
        },
        alert,
      );
    },
    [updateChatLastMessageOnDeletion],
  );

  const handleOnMessageChange = useCallback(
    (value: string) => {
      setMessage(value);

      if (!socket || !isConnected) return;

      if (!selfTyping) {
        setSelfTyping(true);
        socket.emit(SOCKET_EVENTS.TYPING, currentChat.current?._id);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit(SOCKET_EVENTS.STOP_TYPING, currentChat.current?._id);
        setSelfTyping(false);
      }, TYPING_TIMEOUT);
    },
    [socket, isConnected, selfTyping],
  );

  const selectChat = useCallback(
    (chat: ChatListItemInterface) => {
      if (currentChat.current?._id === chat._id) return;

      currentChat.current = chat;
      setIsInfoOpen(false);
      LocalStorage.set("currentChat", chat);
      setMessage("");
      setAttachedFiles([]);
      getMessages();

      // Handle mobile navigation
      if (isMobile) {
        setMobileView("chat-messages");
      }
    },
    [getMessages, isMobile],
  );

  const removeAttachedFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleChatDelete = useCallback(
    (chatId: string) => {
      setChats((prev) => prev.filter((chat) => chat._id !== chatId));
      if (currentChat.current?._id === chatId) {
        closeCurrentChat();
      }
    },
    [closeCurrentChat],
  );

  // Socket event handlers
  const onConnect = useCallback(() => setIsConnected(true), []);
  const onDisconnect = useCallback(() => setIsConnected(false), []);

  const handleOnSocketTyping = useCallback((chatId: string) => {
    if (chatId === currentChat.current?._id) {
      setIsTyping(true);
    }
  }, []);

  const handleOnSocketStopTyping = useCallback((chatId: string) => {
    if (chatId === currentChat.current?._id) {
      setIsTyping(false);
    }
  }, []);

  const onMessageReceived = useCallback(
    (newMessage: ChatMessageInterface) => {
      if (newMessage.chat === currentChat.current?._id) {
        setMessages((prev) => [newMessage, ...prev]);
      } else {
        setUnreadMessages((prev) => [newMessage, ...prev]);
      }
      updateChatLastMessage(newMessage.chat || "", newMessage);
    },
    [updateChatLastMessage],
  );

  const onMessageDelete = useCallback(
    (deletedMessage: ChatMessageInterface) => {
      if (deletedMessage.chat === currentChat.current?._id) {
        setMessages((prev) =>
          prev.filter((msg) => msg._id !== deletedMessage._id),
        );
      } else {
        setUnreadMessages((prev) =>
          prev.filter((msg) => msg._id !== deletedMessage._id),
        );
      }
      updateChatLastMessageOnDeletion(deletedMessage.chat, deletedMessage);
    },
    [updateChatLastMessageOnDeletion],
  );

  const onNewChat = useCallback((chat: ChatListItemInterface) => {
    setChats((prev) => [chat, ...prev]);
  }, []);

  const onChatLeave = useCallback(
    (chat: ChatListItemInterface) => {
      if (chat._id === currentChat.current?._id) {
        closeCurrentChat();
      }
      setChats((prev) => prev.filter((c) => c._id !== chat._id));
    },
    [closeCurrentChat],
  );

  const onGroupNameChange = useCallback(
    (updatedChat: ChatListItemInterface) => {
      if (updatedChat._id === currentChat.current?._id) {
        currentChat.current = updatedChat;
        LocalStorage.set("currentChat", updatedChat);
      }
      setChats((prev) =>
        prev.map((chat) => (chat._id === updatedChat._id ? updatedChat : chat)),
      );
    },
    [],
  );

  // Effects
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

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isMobile && mobileView !== "chat-list") {
          if (mobileView === "chat-info") {
            setMobileView("chat-messages");
          } else {
            closeCurrentChat();
          }
        } else {
          closeCurrentChat();
        }
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [closeCurrentChat, isMobile, mobileView]);

  useEffect(() => {
    getChats();
  }, [getChats]);

  useEffect(() => {
    if (socket && isConnected) {
      const savedChat = LocalStorage.get("currentChat");
      if (savedChat && !currentChat.current) {
        currentChat.current = savedChat;
        socket.emit(SOCKET_EVENTS.JOIN_CHAT, savedChat._id);
        getMessages();

        // Set appropriate mobile view if needed
        if (isMobile) {
          setMobileView("chat-messages");
        }
      }
    }
  }, [socket, isConnected, getMessages, isMobile]);

  useEffect(() => {
    if (!socket) return;

    const eventHandlers = {
      [SOCKET_EVENTS.CONNECTED]: onConnect,
      [SOCKET_EVENTS.DISCONNECT]: onDisconnect,
      [SOCKET_EVENTS.TYPING]: handleOnSocketTyping,
      [SOCKET_EVENTS.STOP_TYPING]: handleOnSocketStopTyping,
      [SOCKET_EVENTS.MESSAGE_RECEIVED]: onMessageReceived,
      [SOCKET_EVENTS.NEW_CHAT]: onNewChat,
      [SOCKET_EVENTS.LEAVE_CHAT]: onChatLeave,
      [SOCKET_EVENTS.UPDATE_GROUP_NAME]: onGroupNameChange,
      [SOCKET_EVENTS.MESSAGE_DELETE]: onMessageDelete,
    };

    // Register event listeners
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Cleanup
    return () => {
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [
    socket,
    onConnect,
    onDisconnect,
    handleOnSocketTyping,
    handleOnSocketStopTyping,
    onMessageReceived,
    onNewChat,
    onChatLeave,
    onGroupNameChange,
    onMessageDelete,
  ]);
  console.log(deviceType);

  // Render helpers
  const renderChatHeader = () => {
    if (!currentChat.current || !user) return null;

    const chatMetadata = getChatObjectMetadata(currentChat.current, user!);
    const initials = getInitials(chatMetadata.title);

    return (
      <div className="p-4 sticky top-0 z-20 flex justify-between items-center w-full border-b-4 border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex justify-start items-center gap-3 w-full">
          <Button
            variant="icon"
            onClick={closeCurrentChat}
            className="rounded-full bg-gray-500 hover:bg-gray-600 transition-colors"
          >
            <IoMdArrowBack className="w-6 h-6 text-white" />
          </Button>

          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={openGroupInfo}
          >
            {currentChat.current.isGroupChat ? (
              <GroupAvatar
                participants={currentChat.current?.participants}
                size={40}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 text-white flex items-center justify-center text-lg font-bold overflow-hidden outline outline-1 outline-gray-500">
                {chatMetadata.avatar ? (
                  <img
                    src={chatMetadata.avatar}
                    alt={initials}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  initials
                )}
              </div>
            )}
            <div>
              <p className="font-bold">{chatMetadata.title}</p>
              <small className="text-zinc-400">
                {chatMetadata.description}
              </small>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAttachedFiles = () => {
    if (attachedFiles.length === 0) return null;

    return (
      <div className="relative grid gap-4 grid-cols-3 sm:grid-cols-5 p-4 justify-start max-w-fit">
        {attachedFiles.map((file, index) => (
          <div
            key={index}
            className="group w-20 h-20 sm:w-32 sm:h-32 relative aspect-square rounded-xl cursor-pointer"
          >
            <button
              onClick={() => removeAttachedFile(index)}
              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove attachment"
            >
              <FiXCircle className="h-5 w-6" />
            </button>
            <img
              className="h-full rounded-xl w-full object-cover"
              src={URL.createObjectURL(file)}
              alt={`Attachment ${index + 1}`}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="flex bg-neutral-100 dark:bg-gray-900 flex-col gap-4 w-full h-full items-center justify-center p-4">
      <img
        src="/icon.png"
        width="150"
        alt="QueeTalk logo"
        className="max-w-[120px] sm:max-w-[150px]"
      />
      <h1 className="text-3xl sm:text-4xl font-bold text-center">QueeTalk</h1>
      <p className="text-lg sm:text-xl text-center">
        Send and receive messages from friends and groups.
      </p>
    </div>
  );

  const renderChatList = () => (
    <div
      className={classNames(
        "flex flex-col border-gray-300 dark:border-gray-800 relative p-4 h-full bg-white dark:bg-gray-900",
        isMobile ? "w-full" : "w-fit border-r-4",
      )}
    >
      {/* Header */}
      <div className="flex flex-row items-center justify-between mb-4">
        <h2 className="text-3xl sm:text-4xl dark:text-white text-green-500 font-bold">
          QueeTalk
        </h2>
        <div className="flex flex-row gap-2 sm:gap-4">
          <Button
            variant="icon"
            className="rounded-full"
            onClick={() => setOpenAddChat(true)}
          >
            <RiChatNewLine className="w-6 h-6 sm:w-8 sm:h-8" />
          </Button>
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="icon"
              className="rounded-full"
              onClick={() => setShowDropdown((prev) => !prev)}
            >
              <BsThreeDotsVertical className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 text-black dark:text-white text-sm shadow-lg rounded-lg overflow-hidden z-50">
                {options.map((option) => (
                  <button
                    key={option.id}
                    className={classNames(
                      "block px-3 py-2 w-full text-left transition-colors",
                      option.id === "Log Out"
                        ? "hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-800 dark:hover:text-red-200"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700",
                    )}
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

      {/* Search */}
      <FormInput
        type="text"
        className={`${isMobile ? "w-50" : ""} bg-transparent rounded-full outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent mb-4`}
        placeholder="Search or start a new chat"
        value={localSearchQuery}
        onChange={(e) => setLocalSearchQuery(e.target.value)}
        icon={<IoMdSearch className="w-5 h-5" />}
      />

      {/* Filters */}
      <div className="flex flex-row gap-2 sm:gap-3 my-4 overflow-x-auto">
        {FILTERS.map((item) => (
          <Button
            key={item}
            variant="outline"
            className="rounded-full whitespace-nowrap"
            isActive={filter === item}
            onClick={() => setFilter(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      {/* Chat List */}
      {loadingChats ? (
        <div className="flex justify-center items-center flex-1">
          <Typing />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filteredChats.map((chat) => (
            <ChatListItem
              key={chat._id}
              chat={chat}
              setChatInfoOpen={setIsInfoOpen}
              isActive={chat._id === currentChat.current?._id}
              unreadCount={
                unreadMessages.filter((msg) => msg.chat === chat._id).length
              }
              onClick={selectChat}
              activeDropdown={activeDropdown}
              onDropdownToggle={setActiveDropdown}
              onChatDelete={handleChatDelete}
              deviceType={deviceType}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderChatMessages = () => (
    <div className="flex flex-col flex-1 h-full bg-white dark:bg-gray-900">
      {renderChatHeader()}

      {/* Messages + Attachments + Input */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Message list should scroll */}
        <div
          className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-4 flex flex-col-reverse gap-6 scrollbar"
          id="chat-window"
        >
          {loadingMessages ? (
            <div className="flex justify-center items-center">
              <Typing />
            </div>
          ) : (
            <>
              {isTyping && <Typing />}
              {messages.map((msg) => (
                <MessageComponent
                  key={msg._id}
                  isOwnMessage={msg.sender?._id === user?._id}
                  isGroupChatMessage={currentChat.current?.isGroupChat}
                  message={msg}
                  deleteChatMessage={deleteChatMessage}
                  deviceType={deviceType}
                />
              ))}
            </>
          )}
        </div>

        {/* Attached Files (non-sticky, will push input down) */}
        {renderAttachedFiles()}

        {/* Sticky input */}
        <div className="sticky bottom-0 p-4 flex justify-between items-center w-full gap-2 z-10 bg-white dark:bg-gray-900">
          <MessageBox
            onMessageChange={handleOnMessageChange}
            message={message}
            onSend={sendChatMessage}
            onFileSend={(files, msg) => sendChatMessage(msg || "", files)}
            chatId={currentChat.current?._id}
            isTyping={isTyping}
          />
        </div>
      </div>
    </div>
  );

  const renderChatInfo = () => (
    <div
      className={classNames(
        "h-full border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-900",
        isMobile || isTablet ? "w-full" : "w-[400px] border-l-4",
      )}
    >
      <ChatInfo
        isOpen={true}
        onClose={() => {
          if (isMobile) {
            setMobileView("chat-messages");
          } else if (isTablet) {
            setMobileView("chat-messages");
          } else {
            setIsInfoOpen(false);
          }
        }}
        data={currentChat.current}
      />
    </div>
  );

  // Main render logic
  if (isMobile) {
    return (
      <div className="flex h-full w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
        {/* Mobile Single Panel View */}
        {mobileView === "chat-list" && renderChatList()}
        {mobileView === "chat-messages" &&
          currentChat.current?._id &&
          renderChatMessages()}
        {mobileView === "chat-info" &&
          currentChat.current?._id &&
          renderChatInfo()}
        {mobileView === "chat-messages" &&
          !currentChat.current?._id &&
          renderEmptyState()}
      </div>
    );
  }
  if (isTablet) {
    return (
      <div className="h-full w-full flex">
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

  // Desktop/Tablet view render
  return (
    <div className="flex h-full w-full bg-gray-50 dark:bg-gray-900">
      {/* Chat List Sidebar */}
      {renderChatList()}

      {/* Main Chat Area */}
      <div className="flex-1 h-full overflow-hidden flex min-w-0">
        {currentChat.current?._id ? (
          <>
            {renderChatMessages()}
            {/* Right Info Panel */}
            {isInfoOpen && currentChat.current?._id && renderChatInfo()}
          </>
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
};

export default ChatPage;
