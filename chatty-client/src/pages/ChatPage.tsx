import { useState, useEffect, useRef } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { RiChatNewLine } from "react-icons/ri";
import Button from "../components/Button";
import { IoMdSearch } from "react-icons/io";
import FormInput from "../components/FormInput";
import { GrGroup } from "react-icons/gr";
import type { FilterType } from "../types/filters";
const filters = ["All", "Unread", "Favourites", "Groups"] as const;
import { MdOutlineGroupAdd } from "react-icons/md";
import { IoMdArrowBack } from "react-icons/io";
import { LuLogOut } from "react-icons/lu";
import {
  getUserChats,
  getMessages,
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
import Typing from "../components/chat/Typing";
import ChatListItem from "../components/chat/ChatListItem";
import MessageComponent from "../components/chat/MessageComponent";
import { FiXCircle } from "react-icons/fi";
import MessageBox from "../components/chat/MessageBox";

const CONNECTED_EVENT = "connected";
const DISCONNECT_EVENT = "disconnect";
const JOIN_CHAT_EVENT = "joinChat";
const NEW_CHAT_EVENT = "newChat";
const TYPING_EVENT = "typing";
const STOP_TYPING_EVENT = "stopTyping";
const MESSAGE_RECEIVED_EVENT = "messageReceived";
const LEAVE_CHAT_EVENT = "leaveChat";
const UPDATE_GROUP_NAME_EVENT = "updateGroupName";
const MESSAGE_DELETE_EVENT = "messageDeleted";

const ChatPage = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();

  const options = [
    { id: "New Group", icon: <MdOutlineGroupAdd size={16} /> },
    { id: "Log Out", icon: <LuLogOut size={16} /> },
  ];

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const currentChat = useRef<ChatListItemInterface | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [openAddChat, setOpenAddChat] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [chats, setChats] = useState<ChatListItemInterface[]>([]);
  const [messages, setMessages] = useState<ChatMessageInterface[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<ChatMessageInterface[]>(
    [],
  );
  const [isTyping, setIsTyping] = useState(false);
  const [selftyping, setSelfTyping] = useState(false);
  const [message, setMessage] = useState("");
  const [localSearchQuerry, setLocalSearchQuerry] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [filter, setFilter] = useState<
    "All" | "Unread" | "Favourites" | "Groups"
  >("All");

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

  // Handle ESC key to close chat
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeCurrentChat();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const closeCurrentChat = () => {
    if (currentChat.current?._id && socket) {
      socket.emit(LEAVE_CHAT_EVENT, currentChat.current._id);
    }
    currentChat.current = null;
    LocalStorage.remove("currentChat");
    setMessages([]);
    setMessage("");
    setAttachedFiles([]);
    setIsTyping(false);
    setSelfTyping(false);
  };

  const handleOptionClick = (id: string) => {
    if (id === "Log Out") {
      logout();
    } else if (id === "New Group") {
      alert("Open New Group Modal");
    }
    setShowDropdown(false);
  };

  const onFilterChange = (item: "All" | "Unread" | "Favourites" | "Groups") => {
    setFilter(item);
  };

  const updateChatLastMessage = (
    chatToUpdateId: string,
    message: ChatMessageInterface,
  ) => {
    const chatToUpdate = chats.find((chat) => chat._id === chatToUpdateId)!;
    chatToUpdate.lastMessage = message;
    chatToUpdate.updatedAt = message?.updatedAt;

    setChats([
      chatToUpdate,
      ...chats.filter((chat) => chat._id !== chatToUpdateId),
    ]);
  };

  const updateChatLastMessageOnDeletion = (
    chatToUpdateId: string,
    message: ChatMessageInterface,
  ) => {
    const chatToUpdate = chats.find((chat) => chat._id === chatToUpdateId)!;
    if (chatToUpdate.lastMessage?._id === message._id) {
      requestHandler(
        async () => getChatMessages(chatToUpdateId),
        null,
        (req) => {
          const { data } = req;
          chatToUpdate.lastMessage = data[0];
          setChats([...chats]);
        },
        alert,
      );
    }
  };

  const getChats = async () => {
    requestHandler(
      async () => await getUserChats(),
      setLoadingChats,
      (res) => {
        const { data } = res;
        setChats(data || []);
      },
      alert,
    );
  };

  const getMessages = async () => {
    if (!currentChat.current?._id) return alert("no Chat is selected");
    if (!socket) return alert("Socket not available");

    socket.emit(JOIN_CHAT_EVENT, currentChat.current._id);
    setUnreadMessages(
      unreadMessages.filter((msg) => msg.chat !== currentChat.current?._id),
    );
    requestHandler(
      async () => await getChatMessages(currentChat.current?._id || ""),
      setLoadingMessages,
      (res) => {
        const { data } = res;
        setMessages(data || []);
      },
      alert,
    );
  };

  const sendChatMessage = async () => {
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

    socket.emit(STOP_TYPING_EVENT, currentChat.current._id);

    await requestHandler(
      async () =>
        await sendMessage(
          currentChat.current?._id || "",
          message,
          attachedFiles,
        ),
      null,
      (res) => {
        setMessage("");
        setAttachedFiles([]);
        setMessages((prev) => [res.data, ...prev]);
        updateChatLastMessage(currentChat.current?._id || "", res.data);
      },
      alert,
    );
  };

  const deleteChatMessage = async (message: ChatMessageInterface) => {
    await requestHandler(
      async () => await deleteMessage(message.chat, message._id),
      null,
      (res) => {
        setMessages((prev) => prev.filter((msg) => msg._id !== res.data._id));
        updateChatLastMessageOnDeletion(message.chat, message);
      },
      alert,
    );
  };

  const handleOnMessageChange = (value: string) => {
    setMessage(value);
    if (!socket || !isConnected) return;

    if (!selftyping) {
      setSelfTyping(true);
      socket.emit(TYPING_EVENT, currentChat.current?._id);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    const timerLength = 3000;

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit(STOP_TYPING_EVENT, currentChat.current?._id);
      setSelfTyping(false);
    }, timerLength);
  };

  const onConnect = () => {
    setIsConnected(true);
  };

  const onDisconnect = () => {
    setIsConnected(false);
  };

  const handleOnSocketTyping = (chatId: string) => {
    if (chatId !== currentChat.current?._id) return;
    setIsTyping(true);
  };

  const handleOnSocketStopTyping = (chatId: string) => {
    if (chatId !== currentChat.current?._id) return;
    setIsTyping(false);
  };

  const onMessageDelete = (message: ChatMessageInterface) => {
    if (message?.chat !== currentChat.current?._id) {
      setUnreadMessages((prev) =>
        prev.filter((msg) => msg._id !== message._id),
      );
    } else {
      setMessages((prev) => prev.filter((msg) => msg._id !== message._id));
    }
    updateChatLastMessageOnDeletion(message.chat, message);
  };

  const onMessageReceived = (message: ChatMessageInterface) => {
    if (message?.chat !== currentChat.current?._id) {
      setUnreadMessages((prev) => [message, ...prev]);
    } else {
      setMessages((prev) => [message, ...prev]);
    }
    updateChatLastMessage(message.chat || "", message);
  };

  const onNewChat = (chat: ChatListItemInterface) => {
    setChats((prev) => [chat, ...prev]);
  };

  const onChatLeave = (chat: ChatListItemInterface) => {
    if (chat._id === currentChat.current?._id) {
      closeCurrentChat();
    }
    setChats((prev) => prev.filter((c) => c._id !== chat._id));
  };

  const onGroupNameChange = (chat: ChatListItemInterface) => {
    if (chat._id === currentChat.current?._id) {
      currentChat.current = chat;
      LocalStorage.set("currentChat", chat);
    }
    setChats((prev) => [
      ...prev.map((c) => {
        if (c._id === chat._id) {
          return chat;
        }
        return c;
      }),
    ]);
  };

  // Initialize chats and restore current chat from localStorage
  useEffect(() => {
    getChats();
  }, []);

  // Handle socket connection and restore current chat when socket is ready
  useEffect(() => {
    if (socket && isConnected) {
      const _currentChat = LocalStorage.get("currentChat");
      if (_currentChat && !currentChat.current) {
        currentChat.current = _currentChat;
        socket.emit(JOIN_CHAT_EVENT, _currentChat._id);
        getMessages();
      }
    }
  }, [socket, isConnected]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on(CONNECTED_EVENT, onConnect);
    socket.on(DISCONNECT_EVENT, onDisconnect);
    socket.on(TYPING_EVENT, handleOnSocketTyping);
    socket.on(STOP_TYPING_EVENT, handleOnSocketStopTyping);
    socket.on(MESSAGE_RECEIVED_EVENT, onMessageReceived);
    socket.on(NEW_CHAT_EVENT, onNewChat);
    socket.on(LEAVE_CHAT_EVENT, onChatLeave);
    socket.on(UPDATE_GROUP_NAME_EVENT, onGroupNameChange);
    socket.on(MESSAGE_DELETE_EVENT, onMessageDelete);

    return () => {
      socket.off(CONNECTED_EVENT, onConnect);
      socket.off(DISCONNECT_EVENT, onDisconnect);
      socket.off(TYPING_EVENT, handleOnSocketTyping);
      socket.off(STOP_TYPING_EVENT, handleOnSocketStopTyping);
      socket.off(MESSAGE_RECEIVED_EVENT, onMessageReceived);
      socket.off(NEW_CHAT_EVENT, onNewChat);
      socket.off(LEAVE_CHAT_EVENT, onChatLeave);
      socket.off(UPDATE_GROUP_NAME_EVENT, onGroupNameChange);
      socket.off(MESSAGE_DELETE_EVENT, onMessageDelete);
    };
  }, [socket, chats]);

  return (
    <div className="flex h-full w-full">
      {/* chat list component begins */}
      <div className="w-fit flex flex-col border-r-4 border-gray-300 dark:border-gray-800 relative p-4 h-full">
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
                  {options.map((option) => (
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
          className="w-full bg-transparent rounded-full outline-green-500"
          placeholder="Search or start a new chat"
          value={localSearchQuerry}
          onChange={(e) => setLocalSearchQuerry(e.target.value)}
          icon={<IoMdSearch className="w-5 h-5" />}
        />

        <div className="flex flex-row gap-3 my-4">
          {filters.map((item) => (
            <Button
              key={item}
              variant="outline"
              className="rounded-full"
              isActive={filter === item}
              onClick={() => onFilterChange(item)}
            >
              {item}
            </Button>
          ))}
        </div>

        {/* chats listing begins */}
        {loadingChats ? (
          <div className="flex justify-center items-center h-[calc(100%-88px)]">
            <Typing />
          </div>
        ) : (
          [...chats]
            .filter((chat) =>
              localSearchQuerry
                ? getChatObjectMetadata(chat, user!)
                    .title?.toLowerCase()
                    ?.includes(localSearchQuerry.toLowerCase())
                : true,
            )
            .map((chat) => {
              return (
                <ChatListItem
                  chat={chat}
                  isActive={chat._id === currentChat.current?._id}
                  unreadCount={
                    unreadMessages.filter((n) => n.chat === chat._id).length
                  }
                  onClick={(chat) => {
                    if (
                      currentChat.current?._id &&
                      currentChat.current._id === chat._id
                    )
                      return;
                    currentChat.current = chat;
                    LocalStorage.set("currentChat", chat);
                    setMessage("");
                    setAttachedFiles([]);
                    getMessages();
                  }}
                  key={chat._id}
                  activeDropdown={activeDropdown}
                  onDropdownToggle={setActiveDropdown}
                  onChatDelete={(chatId) => {
                    setChats((prev) =>
                      prev.filter((chat) => chat._id !== chatId),
                    );
                    if (currentChat.current?._id === chatId) {
                      closeCurrentChat();
                    }
                  }}
                />
              );
            })
        )}
      </div>

      <div className="w-full overflow-y-hidden">
        {currentChat.current && currentChat.current?._id ? (
          <>
            <div className="p-4 sticky top-0 z-20 flex justify-between group items-center w-full border-b-4 border-gray-800">
              <div className="flex justify-start items-center w-max gap-3">
                <Button
                  variant="icon"
                  onClick={closeCurrentChat}
                  className="rounded-full bg-gray-500 hover:bg-gray-600 transition-colors"
                >
                  <IoMdArrowBack className="w-6 h-6 text-white" />
                </Button>

                {currentChat.current.isGroupChat ? (
                  <div className="w-12 relative h-12 flex-shrink-0 flex justify-start items-center flex-nowrap">
                    {currentChat.current.participants
                      .slice(0, 3)
                      .map((participant, i) => {
                        return (
                          <img
                            key={participant._id}
                            src={participant.avatar.url}
                            className={classNames(
                              "w-9 h-9 border-[1px] border-white rounded-full absolute outline outline-4 outline-dark",
                              i === 0
                                ? "left-0 z-30"
                                : i === 1
                                  ? "left-2 z-20"
                                  : i === 2
                                    ? "left-4 z-10"
                                    : "",
                            )}
                          />
                        );
                      })}
                  </div>
                ) : (
                  <img
                    className="h-14 w-14 rounded-full flex flex-shrink-0 object-cover"
                    src={
                      getChatObjectMetadata(currentChat.current, user!).avatar
                    }
                  />
                )}
                <div>
                  <p className="font-bold">
                    {getChatObjectMetadata(currentChat.current, user!).title}
                  </p>
                  <small className="text-zinc-400">
                    {
                      getChatObjectMetadata(currentChat.current, user!)
                        .description
                    }
                  </small>
                </div>
              </div>
            </div>

            <div
              className={classNames(
                "p-8 overflow-y-auto flex flex-col-reverse gap-6 w-full",
                attachedFiles.length > 0
                  ? "h-[calc(100vh-336px)]"
                  : "h-[calc(100vh-176px)]",
              )}
              id="chat-window"
            >
              {loadingMessages ? (
                <div className="flex justify-center items-center">
                  <Typing />
                </div>
              ) : (
                <>
                  {isTyping ? <Typing /> : null}
                  {messages?.map((msg) => {
                    return (
                      <MessageComponent
                        key={msg._id}
                        isOwnMessage={msg.sender?._id === user?._id}
                        isgroupChatMessage={currentChat.current?.isGroupChat}
                        message={msg}
                        deleteChatMessage={deleteChatMessage}
                      />
                    );
                  })}
                </>
              )}
            </div>

            {attachedFiles.length > 0 ? (
              <div className="grid gap-4 grid-cols-5 p-4 justify-start max-w-fit">
                {attachedFiles.map((file, i) => {
                  return (
                    <div
                      className="group w-32 h-32 relative aspect-square rounded-xl cursor-pointer"
                      key={i}
                    >
                      <div className="absolute inset-0 flex justify-center items-center w-full group-hover:opacity-100 opacity-0 transition-opacity ease-in-out duration-150">
                        <button
                          onClick={() => {
                            setAttachedFiles(
                              attachedFiles.filter((_, _ind) => _ind !== i),
                            );
                          }}
                          className="absolute -top-2 -right-2"
                        >
                          <FiXCircle className="h-5 w-6" />
                        </button>
                      </div>
                      <img
                        className="h-full rounded-xl w-full object-cover"
                        src={URL.createObjectURL(file)}
                        alt="attachment"
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="sticky top-full p-4 flex justify-between items-center w-full gap-2 border-t-1 border-gray-800">
              <MessageBox
                onMessageChange={handleOnMessageChange}
                message={message}
                onSend={sendChatMessage}
                chatId={currentChat.current._id}
                attachedFiles={attachedFiles}
                setAttachedFiles={setAttachedFiles}
                onTyping={isTyping}
              />
            </div>
          </>
        ) : (
          <div className="flex bg-neutral-100 dark:bg-gray-900 flex-col gap-4 w-full h-full items-center justify-center">
            <img src="/icon.png" width="150px" />
            <h1 className="text-4xl font-bold">Chatty</h1>
            <h1 className="text-xl">
              Send and receive messages from friends and groups.
            </h1>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
