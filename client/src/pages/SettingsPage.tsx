import { GoGear } from "react-icons/go";
import { IoMdSearch } from "react-icons/io";
import FormInput from "../components/FormInput";
import { useAuth } from "../contexts/AuthContext";
import { LuMessageSquareDashed, LuLogOut } from "react-icons/lu";
import { MdBlock, MdOutlineMarkUnreadChatAlt } from "react-icons/md";
import { FiHeart } from "react-icons/fi";
import { FaRegBell } from "react-icons/fa";
import { LiaUserShieldSolid } from "react-icons/lia";
import { getInitials } from "../utils";

const SettingPage = () => {
  const { user } = useAuth();
  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-gray-900 text-white">
      <div className="w-fit p-2 border-r-4 border-gray-700 flex flex-col items-center">
        <h2 className="text-3xl font-bold mb-6 self-start">Setting</h2>
        <div className="w-full">
          {/* search box */}
          <FormInput
            type="text"
            className="w-[425px] bg-transparent rounded-full outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Search Setting...."
            icon={<IoMdSearch className="w-5 h-5" />}
          />
          {/* profile view */}
          <div className="border-b-2 border-gray-800 py-3 px-2">
            <div className="w-full flex flex-row mt-3 hover:bg-gray-700 p-1 rounded-lg">
              {user?.avatar?.url ? (
                <img
                  src={user?.avatar.url}
                  alt={getInitials(user?.name)}
                  className="object-cover rounded-full w-14 h-14"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 dark:bg-gray-700 text-white flex items-center justify-center text-7xl font-bold">
                  {getInitials(user?.name)}
                </div>
              )}
              <div className="ml-3">
                <p className="text-base">{user?.name}</p>
                <p className="text-base text-gray-400">{user?.email}</p>
              </div>
            </div>
          </div>
          {/* setting section */}
          <div className="border-b-2 border-gray-800 py-2">
            <div className="w-full flex mt-3 p-3  hover:bg-gray-700 rounded-lg items-center">
              <LiaUserShieldSolid className="w-8 h-8 mr-4" />
              <div className="flex flex-col">
                <p className="text-lg">Enable 2FA</p>
                <p className="text-sm text-gray-400">
                  {user.twoFA.enabled ? "2FA enabled" : "2FA disabled"}
                </p>
              </div>
            </div>
            <div className="w-full flex flex-row mt-3 p-3 hover:bg-gray-700 text-lg rounded-lg items-center">
              <LuMessageSquareDashed className="w-8 h-8 mr-4" />
              <div className="flex flex-col">
                <p className="text-lg"> Disappearing Message</p>
                <p className="text-sm text-gray-400">24 hrs</p>
              </div>
            </div>
            <div className="w-full flex flex-row mt-3 p-3 hover:bg-gray-700 text-lg rounded-lg items-center">
              <FiHeart className="w-8 h-8 mr-4" />
              <div className="flex flex-col">
                <p className="text-lg"> Favourites Contact</p>
                <p className="text-sm text-gray-400">{`${user.favorites.length} contacts`}</p>
              </div>
            </div>
            <div className="w-full flex flex-row mt-3 p-3 hover:bg-gray-700 text-lg rounded-lg items-center">
              <MdBlock className="w-8 h-8 mr-4" />

              <div className="flex flex-col">
                <p className="text-lg"> Blocked Contacts</p>
                <p className="text-sm text-gray-400">{`${user.blockedUsers.length} contacts`}</p>
              </div>
            </div>
            <div className="w-full flex flex-row mt-3 p-3 hover:bg-gray-700 text-lg rounded-lg items-center">
              <MdOutlineMarkUnreadChatAlt className="w-8 h-8 mr-4" />
              <div className="flex flex-col">
                <p className="text-lg"> Chat Requests</p>
                <p className="text-sm text-gray-400">{`${user.messageRequests.length} chat request${user.messageRequests.length > 1 ? "s" : ""}`}</p>
              </div>
            </div>
            <div className="w-full flex flex-row mt-3 p-3 hover:bg-gray-700 text-lg rounded-lg items-center">
              <FaRegBell className="w-8 h-8 mr-4" />
              <div className="flex flex-col">
                <p className="text-lg">Notifications</p>
                <p className="text-sm text-gray-400">Message Notifications</p>
              </div>
            </div>
            <div className="w-full flex flex-row mt-3 p-3 text-red-500 hover:bg-gray-700 text-lg rounded-lg items-center">
              <LuLogOut className="text-red-500 w-8 h-8 mr-4" />
              Log out
            </div>
          </div>
        </div>
      </div>

      <div className="md:flex hidden flex-grow flex-col justify-center items-center">
        <GoGear size={64} className="text-gray-500" />
        <p className="text-4xl font-bold mt-4">Setting</p>
      </div>
    </div>
  );
};

export default SettingPage;
