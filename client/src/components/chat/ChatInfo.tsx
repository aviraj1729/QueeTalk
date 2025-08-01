import { MdClose } from "react-icons/md";
import { getChatObjectMetadata } from "../../utils";
import { useAuth } from "../../contexts/AuthContext";
import { ChatListItemInterface } from "../../interfaces/chat";
import Button from "../Button";
import { classNames } from "../../utils";
import GroupAvatar from "./GroupAvatar";
import { IoMdExit, IoMdSearch } from "react-icons/io";
import { FiHeart } from "react-icons/fi";
import { IoPersonAdd } from "react-icons/io5";

const ChatInfo: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  data: ChatListItemInterface;
}> = ({ isOpen, onClose, data }) => {
  const { user } = useAuth();
  console.log(user);

  // Hide the component entirely if not open
  if (!isOpen) return null;
  const chatMetaData = getChatObjectMetadata(data, user);

  return (
    <div className="p-4">
      <div className="flex items-center justify-start">
        <Button
          variant="icon"
          onClick={onClose}
          className="rounded-full bg-gray-500 hover:bg-gray-600 mr-1 transition-colors"
        >
          <MdClose className="w-6 h-6 text-white" />
        </Button>
        <h2 className="text-lg px-4 text-start font-semibold text-gray-800 dark:text-gray-100">
          {data.isGroupChat ? "Group Info" : "Contact Info"}
        </h2>
      </div>
      <div className="flex flex-col items-center border-b-2 boreder-gray-300 dark:border-gray-800">
        {data.isGroupChat ? (
          <GroupAvatar participants={data.participants} size={64} />
        ) : (
          <img
            className="h-32 w-32 rounded-full flex-shrink-0 object-cover"
            src={chatMetaData.avatar}
            alt="Chat avatar"
          />
        )}

        <p className="text-2xl mt-4">{chatMetaData.title}</p>
        {data.isGroupChat ? (
          <p className="text-md text-gray-300 dark:text-gray-300 mt-1">
            {`Group: ${data.participants.length} members`}
          </p>
        ) : (
          <>
            <p className="text-md text-gray-300 dark:text-gray-300 mt-1">
              {chatMetaData.description}
            </p>
            <p className="text-md text-gray-300 dark:text-gray-300 mt-1">
              {chatMetaData.contact}
            </p>
          </>
        )}
      </div>
      {data.isGroupChat ? (
        <div className="p-2 flex flex-col justify-between items-center">
          <div className="flex flex-row justify-between w-full">
            <span className="text-md text-gray-300 ml-2 dark:text-gray-300 self-start">
              {data.participants.length} members
            </span>
            <Button
              variant="icon"
              className="rounded-full hover:bg-gray-600 mr-1 transition-colors"
            >
              <IoMdSearch className="w-6 h-6 text-white" />
            </Button>
          </div>
          <div className="w-full self-center overflow-y-auto my-2 p-2 flex flex-row cursor-pointer rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 items-center">
            <Button
              variant="icon"
              onClick={onClose}
              className="rounded-full mr-2 transition-colors bg-green-500"
            >
              <IoPersonAdd className="w-6 h-6 text-black" />
            </Button>
            Add member
          </div>
          {data.participants.map((participant) => {
            return (
              <div className="w-full overflow-y-auto my-2 p-2 flex flex-row cursor-pointer rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800">
                <div className="flex flex-row">
                  <img
                    className="h-14 w-14 rounded-full flex-shrink-0 object-cover"
                    src={participant.avatar.url}
                    alt="Chat avatar"
                  />
                  <div className="flex flex-col">
                    <p className="text-md text-gray-300 turncate ml-3 t dark:text-gray-300">
                      {participant._id.toString === user._id.toString()
                        ? "You"
                        : participant.name}
                    </p>
                    <p className="text-sm text-gray-300 ml-3 dark:text-gray-300">
                      {participant.email}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col ml-2 justify-center">
                  <p className="rounded-md px-1 self-center bg-green-800 text-white text-sm">
                    {data.admin.toString() === participant._id.toString()
                      ? "Group Admin"
                      : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="w-full self-center overflow-y-auto my-2 p-2 flex flex-row cursor-pointer rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 items-center">
        <Button
          variant="icon"
          onClick={onClose}
          className="rounded-full mr-1 transition-colors"
        >
          <FiHeart className="w-6 h-6" />
        </Button>
        Add to Favourite
      </div>
      <div className="w-full overflow-y-auto my-2 p-2 text-red-400 flex flex-row cursor-pointer rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 items-center">
        <Button
          variant="icon"
          onClick={onClose}
          className="rounded-full mr-1 transition-colors"
        >
          <IoMdExit className="w-6 h-6 text-red-400" />
        </Button>
        {data.isGroupChat ? "Exit Group" : "Delete Chat"}
      </div>
    </div>
  );
};

export default ChatInfo;
