import { useState } from "react";
import Sidebar from "../components/Sidebar";
import StatusPage from "./StatusPage";
import ProfilePage from "./ProfilePage";
import SettingsPage from "./SettingsPage";
import ChatPage from "./ChatPage";

const Layout = () => {
  const [activeTab, setActiveTab] = useState<
    "chat" | "status" | "profile" | "setting"
  >("chat");

  return (
    <div className="flex">
      <div className="w-20 border-r-4 dark:border-gray-800 border-gray-300">
        <Sidebar currentTab={activeTab} onTabChange={setActiveTab} />
      </div>
      <div className="flex-1">
        {activeTab === "chat" && <ChatPage />}
        {activeTab === "status" && <StatusPage />}
        {activeTab === "profile" && <ProfilePage />}
        {activeTab === "setting" && <SettingsPage />}
      </div>
    </div>
  );
};

export default Layout;
