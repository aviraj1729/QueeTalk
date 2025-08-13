import { useState } from "react";
import Sidebar from "../components/Sidebar";
import StatusPage from "./StatusPage";
import ProfilePage from "./ProfilePage";
import SettingsPage from "./SettingsPage";
import ChatPage from "./ChatPage";
import ResponsiveChatApp from "./Test";

const Layout = () => {
  const [activeTab, setActiveTab] = useState<
    "chat" | "status" | "profile" | "setting"
  >("chat");

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      {/* Sidebar for large screens */}
      <div className="hidden lg:block w-20 border-r-4 dark:border-gray-800 border-gray-300">
        <Sidebar currentTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        {activeTab === "chat" && <ChatPage />}
        {activeTab === "status" && <StatusPage />}
        {activeTab === "profile" && <ProfilePage />}
        {activeTab === "setting" && <SettingsPage />}
      </div>

      {/* Bottom nav for mobile/tablet */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0">
        <Sidebar
          currentTab={activeTab}
          onTabChange={setActiveTab}
          isHorizontal
        />
      </div>
    </div>
  );
};

export default Layout;
