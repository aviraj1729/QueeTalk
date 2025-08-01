import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { RiChatNewLine } from "react-icons/ri";
import { IoMdSearch, IoMdArrowBack } from "react-icons/io";
import { MdOutlineGroupAdd } from "react-icons/md";
import { LuLogOut } from "react-icons/lu";
import { FiXCircle } from "react-icons/fi";

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
  LocalStorage,
  classNames,
  getChatObjectMetadata,
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

  // Memoized values
  const options = useMemo(
    () => [
      { id: "New Group", icon: <MdOutlineGroupAdd size={16} /> },
      { id: "Log Out", icon: <LuLogOut size={16} /> },
    ],
    [],
  );

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
  }, [socket]);

  const openGroupInfo = useCallback(() => {
    setIsInfoOpen(false);
  }, []);

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

  const sendChatMessage = useCallback(async () => {
    if (!message.trim() && attachedFiles.length === 0) {
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
      () => sendMessage(currentChat.current?._id || "", message, attachedFiles),
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
  }, [message, attachedFiles, socket, updateChatLastMessage]);

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
    },
    [getMessages],
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
        closeCurrentChat();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [closeCurrentChat]);

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
      }
    }
  }, [socket, isConnected, getMessages]);

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

  // Render helpers
  const renderChatHeader = () => {
    if (!currentChat.current || !user) return null;

    const chatMetadata = getChatObjectMetadata(currentChat.current, user);

    return (
      <div
        className="p-4 sticky top-0 z-20 flex justify-between items-center w-full border-b-4 border-gray-800 cursor-pointer"
        onClick={() => setIsInfoOpen(true)}
      >
        <div className="flex justify-start items-center w-max gap-3">
          <Button
            variant="icon"
            onClick={closeCurrentChat}
            className="rounded-full bg-gray-500 hover:bg-gray-600 transition-colors"
          >
            <IoMdArrowBack className="w-6 h-6 text-white" />
          </Button>

          {currentChat.current.isGroupChat ? (
            <GroupAvatar
              participants={currentChat.current?.participants}
              size={40}
            />
          ) : (
            <img
              className="h-12 w-12 rounded-full flex flex-shrink-0 object-cover"
              src={chatMetadata.avatar}
              alt="Chat avatar"
            />
          )}
          <div className="ml-2">
            <p className="font-bold">{chatMetadata.title}</p>
            <small className="text-zinc-400">{chatMetadata.description}</small>
          </div>
        </div>
      </div>
    );
  };

  const renderAttachedFiles = () => {
    if (attachedFiles.length === 0) return null;

    return (
      <div className="relative grid gap-4 grid-cols-5 p-4 justify-start max-w-fit">
        {attachedFiles.map((file, index) => (
          <div
            key={index}
            className="group w-32 h-32 relative aspect-square rounded-xl cursor-pointer"
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
    <div className="flex bg-neutral-100 dark:bg-gray-900 flex-col gap-4 w-full h-full items-center justify-center">
      <img src="/icon.png" width="150" alt="QueeTalk logo" />
      <h1 className="text-4xl font-bold">QueeTalk</h1>
      <p className="text-xl">
        Send and receive messages from friends and groups.
      </p>
    </div>
  );

  return (
    <div className="flex h-full w-full">
      <AddChat
        open={openAddChat}
        onClose={() => setOpenAddChat(false)}
        onSuccess={getChats}
      />

      {/* Chat List Sidebar */}
      <div className="w-fit flex flex-col border-r-4 border-gray-300 dark:border-gray-800 relative p-4 h-full">
        {/* Header */}
        <div className="flex flex-row">
          <h2 className="text-4xl dark:text-white text-green-500 font-bold mb-4">
            QueeTalk
          </h2>
          <div className="absolute flex flex-row right-0 gap-4 mr-4">
            <Button
              variant="icon"
              className="rounded-full"
              onClick={() => setOpenAddChat(true)}
            >
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
          className="w-full bg-transparent rounded-full outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Search or start a new chat"
          value={localSearchQuery}
          onChange={(e) => setLocalSearchQuery(e.target.value)}
          icon={<IoMdSearch className="w-5 h-5" />}
        />

        {/* Filters */}
        <div className="flex flex-row gap-3 my-4">
          {FILTERS.map((item) => (
            <Button
              key={item}
              variant="outline"
              className="rounded-full"
              isActive={filter === item}
              onClick={() => setFilter(item)}
            >
              {item}
            </Button>
          ))}
        </div>

        {/* Chat List */}
        {loadingChats ? (
          <div className="flex justify-center items-center h-[calc(100%-88px)]">
            <Typing />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {filteredChats.map((chat) => (
              <ChatListItem
                key={chat._id}
                chat={chat}
                isActive={chat._id === currentChat.current?._id}
                unreadCount={
                  unreadMessages.filter((msg) => msg.chat === chat._id).length
                }
                onClick={selectChat}
                activeDropdown={activeDropdown}
                onDropdownToggle={setActiveDropdown}
                onChatDelete={handleChatDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="w-full h-screen overflow-hidden flex">
        {currentChat.current?._id ? (
          <>
            <div className="flex flex-col flex-1">
              {renderChatHeader()}

              {/* Messages + Attachments + Input */}
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Message list should scroll */}
                <div
                  className="flex-1 overflow-y-auto px-6 pt-6 pb-4 flex flex-col-reverse gap-6"
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
                        />
                      ))}
                    </>
                  )}
                </div>

                {/* Attached Files (non-sticky, will push input down) */}
                {renderAttachedFiles()}

                {/* Sticky input */}
                <div className="sticky bottom-0 p-4 flex justify-between items-center w-full gap-2 z-10">
                  <MessageBox
                    onMessageChange={handleOnMessageChange}
                    message={message}
                    onSend={sendChatMessage}
                    onFileSend={sendChatMessage}
                    chatId={currentChat.current?._id}
                    isTyping={isTyping}
                  />
                </div>
              </div>
            </div>

            {/* Right Panel */}
            {isInfoOpen && (
              <div className="md:w-[400px] h-screen border-l border-gray-300 dark:border-gray-800">
                <ChatInfo
                  isOpen={isInfoOpen}
                  onClose={() => setIsInfoOpen(false)}
                  data={currentChat.current}
                />
              </div>
            )}
          </>
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
};

export default ChatPage;
