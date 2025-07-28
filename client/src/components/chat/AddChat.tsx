import Button from "../Button";
import FormInput from "../FormInput";
import { UserInterface } from "../../interfaces/User";
import { ChatListItemInterface } from "../../interfaces/chat";
import { classNames, requestHandler } from "../../utils";
import { createGroupChat, createUserChat, getAvailableUsers } from "../../api";
import { Fragment, useState, useEffect } from "react";
import { IoMdArrowBack, IoMdClose } from "react-icons/io";
import { HiUsers, HiUser, HiSearch } from "react-icons/hi";
import { BsCheckCircleFill } from "react-icons/bs";

const AddChat: React.FC<{
  open: boolean;
  onClose: () => void;
  onSuccess: (chat: ChatListItemInterface) => void;
}> = ({ open, onClose, onSuccess }) => {
  const [users, setUsers] = useState<UserInterface[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserInterface[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupParticipants, setGroupParticipants] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<null | string>(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [step, setStep] = useState<"main" | "users" | "group-info">("main");

  const getUsers = async () => {
    requestHandler(
      async () => await getAvailableUsers(),
      null,
      (res) => {
        const { data } = res;
        setUsers(data || []);
        setFilteredUsers(data || []);
      },
      alert,
    );
  };

  const createNewChat = async () => {
    if (!selectedUserId) return alert("Please select a user");
    await requestHandler(
      async () => await createUserChat(selectedUserId),
      setCreatingChat,
      (res) => {
        const { data } = res;
        if (res.statusCode === 200) {
          alert("Chat with selected user already exists.");
          return;
        }
        onSuccess(data);
        handleClose();
      },
      alert,
    );
  };

  const createNewGroupChat = async () => {
    if (!groupName.trim()) return alert("Please enter a group name");
    if (groupParticipants.length < 2)
      return alert("Please select at least 2 participants");

    await requestHandler(
      async () => await createGroupChat(groupName, groupParticipants),
      setCreatingChat,
      (res) => {
        const { data } = res;
        onSuccess(data);
        handleClose();
      },
      alert,
    );
  };

  const handleClose = () => {
    setUsers([]);
    setFilteredUsers([]);
    setSelectedUserId("");
    setGroupName("");
    setGroupParticipants([]);
    setIsGroupChat(false);
    setSearchQuery("");
    setStep("main");
    onClose();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredUsers(users);
      return;
    }
    const filtered = users.filter(
      (user) =>
        user.username?.toLowerCase().includes(query.toLowerCase()) ||
        user.email?.toLowerCase().includes(query.toLowerCase()),
    );
    setFilteredUsers(filtered);
  };

  const toggleGroupParticipant = (userId: string) => {
    setGroupParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleUserSelect = (userId: string) => {
    if (isGroupChat) {
      toggleGroupParticipant(userId);
    } else {
      setSelectedUserId(userId);
      createNewChat();
    }
  };

  const getSelectedUsers = () => {
    return users.filter((user) => groupParticipants.includes(user._id));
  };

  useEffect(() => {
    if (!open) return;
    getUsers();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-[600px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="icon"
              onClick={() => {
                if (step === "main") {
                  handleClose();
                } else if (step === "users") {
                  setStep("main");
                } else if (step === "group-info") {
                  setStep("users");
                }
              }}
              className="rounded-full bg-green-700 hover:bg-green-800 transition-colors p-2"
            >
              <IoMdArrowBack className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold">
                {step === "main"
                  ? "New Chat"
                  : step === "users"
                    ? isGroupChat
                      ? "Add Participants"
                      : "Select Contact"
                    : "Group Info"}
              </h2>
              {step === "users" && isGroupChat && (
                <p className="text-sm text-green-100">
                  {groupParticipants.length} of {users.length} selected
                </p>
              )}
            </div>
          </div>

          {step === "users" && isGroupChat && groupParticipants.length > 0 && (
            <Button
              onClick={() => setStep("group-info")}
              className="bg-green-700 hover:bg-green-800 px-4 py-2 rounded-full text-sm font-medium"
            >
              Next
            </Button>
          )}
        </div>

        {/* Main Menu */}
        {step === "main" && (
          <div className="flex-1 p-4">
            <div className="space-y-4">
              <div
                onClick={() => {
                  setIsGroupChat(false);
                  setStep("users");
                }}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <HiUser className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">New Chat</p>
                  <p className="text-sm text-gray-500">
                    Start a conversation with a contact
                  </p>
                </div>
              </div>

              <div
                onClick={() => {
                  setIsGroupChat(true);
                  setStep("users");
                }}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <HiUsers className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">New Group</p>
                  <p className="text-sm text-gray-500">
                    Create a group with multiple contacts
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Selection */}
        {step === "users" && (
          <>
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Selected Participants (for group chat) */}
            {isGroupChat && groupParticipants.length > 0 && (
              <div className="p-4 border-b border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {getSelectedUsers().map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                    >
                      <span>{user.username || user.email}</span>
                      <button
                        onClick={() => toggleGroupParticipant(user._id)}
                        className="hover:bg-green-200 rounded-full p-1"
                      >
                        <IoMdClose className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User List */}
            <div className="flex-1 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <HiUser className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No contacts found</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => handleUserSelect(user._id)}
                      className={classNames(
                        "flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                        isGroupChat && groupParticipants.includes(user._id)
                          ? "bg-green-50"
                          : "",
                      )}
                    >
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium">
                          {(user.username || user.email)
                            ?.charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {user.username || user.email}
                        </p>
                        {user.username && (
                          <p className="text-sm text-gray-500">{user.email}</p>
                        )}
                      </div>
                      {isGroupChat && groupParticipants.includes(user._id) && (
                        <BsCheckCircleFill className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Group Info */}
        {step === "group-info" && (
          <div className="flex-1 p-4">
            <div className="space-y-6">
              {/* Group Icon */}
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
                  <HiUsers className="w-12 h-12 text-gray-600" />
                </div>
              </div>

              {/* Group Name Input */}
              <div>
                <FormInput
                  placeholder="Group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Participants List */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Participants: {groupParticipants.length}
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {getSelectedUsers().map((user) => (
                    <div key={user._id} className="flex items-center gap-3 p-2">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-medium">
                          {(user.username || user.email)
                            ?.charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-900">
                        {user.username || user.email}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create Group Button */}
              <Button
                onClick={createNewGroupChat}
                disabled={creatingChat || !groupName.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium disabled:opacity-50"
              >
                {creatingChat ? "Creating Group..." : "Create Group"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddChat;
