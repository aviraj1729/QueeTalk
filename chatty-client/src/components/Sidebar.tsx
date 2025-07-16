import React, { useState } from "react";
import { MdOutlineChat } from "react-icons/md";
import { MdUpdate } from "react-icons/md";
import { GoGear } from "react-icons/go";
import { CgProfile } from "react-icons/cg";
import Button from "./Button";

type Props = {
  currentTab: string;
  onTabChange: (tab: "chat" | "status" | "setting" | "profile") => void;
};

const Sidebar = ({ currentTab, onTabChange }: Props) => {
  const topItems = [
    { id: "chat", icon: <MdOutlineChat size={24} />, label: "chat" },
    { id: "status", icon: <MdUpdate size={24} />, label: "status" },
  ];

  const bottomItems = [
    { id: "setting", icon: <GoGear size={24} />, label: "setting" },
    { id: "profile", icon: <CgProfile size={24} />, label: "profile" },
  ];

  return (
    <aside className="flex flex-col h-screen pt-8 dark:bg-gray-900 bg-neutral-100">
      <nav className="flex flex-col justify-between flex-1 items-center px-2 py-4">
        {/* Top Items */}
        <div className="flex flex-col items-center space-y-6">
          {topItems.map((item) => (
            <Button
              key={item.id}
              className="rounded-full"
              variant="icon"
              isActive={currentTab === item.id}
              onClick={() => onTabChange(item.id as Props["currentTab"])}
            >
              {item.icon}
            </Button>
          ))}
        </div>

        {/* Bottom Items */}
        <div className="flex flex-col items-center space-y-6">
          {bottomItems.map((item) => (
            <Button
              key={item.id}
              className="rounded-full"
              variant="icon"
              isActive={currentTab === item.id}
              onClick={() => onTabChange(item.id as Props["currentTab"])}
            >
              {item.icon}
            </Button>
          ))}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
